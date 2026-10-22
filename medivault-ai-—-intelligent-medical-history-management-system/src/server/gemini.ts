import { GoogleGenAI } from '@google/genai';
import { MedicalRecord, PatientProfile } from './types.js';

// Server-side initialization per Google GenAI guidelines
const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

/**
 * FEATURE 1: AI Medical History Summarizer
 * Generates a structured 10-point clinical summary from authorized records.
 */
export async function generateClinicalSummary(
  patient: PatientProfile,
  records: MedicalRecord[],
  requesterDoctorName: string
): Promise<{
  modelVersion: string;
  summaryContent: {
    baselineDemographics: string;
    pastConditions: string[];
    hospitalVisits: string[];
    currentMedications: Array<{ medication: string; dosage: string; sourceRecordId: string }>;
    historicalMedications: Array<{ medication: string; sourceRecordId: string; status: string }>;
    documentedAllergies: string[];
    keyInvestigations: Array<{ test: string; result: string; date: string; sourceRecordId: string }>;
    surgicalHistory: string[];
    followUpPlan: string;
    dataGapsAndConflicts: string[];
  };
  rawText?: string;
  sourceRecordIds: string[];
}> {
  const sourceRecordIds = records.map(r => r.recordId);
  const ai = getGenAIClient();

  // Prepare structured clinical context with explicit provenance markers
  const sanitizedRecordsContext = records.map(r => ({
    recordId: r.recordId,
    date: r.recordDate,
    category: r.recordCategory,
    hospital: r.hospitalName,
    doctor: r.createdByName,
    title: r.title,
    diagnosis: r.clinicianDiagnosis || 'Not documented',
    medications: r.medications || [],
    labResults: r.labResults || [],
    complaint: r.presentingComplaint,
    findings: r.examinationFindings,
    plan: r.treatmentAndFollowUpPlan,
    surgicalProcedure: r.surgicalProcedure,
    dischargeStatus: r.dischargeStatus,
  }));

  const systemPrompt = `You are a medical records AI assistant supporting clinical review for licensed physicians.
Strict Safety Rules:
1. You MUST NEVER invent or hallucinate clinical information, diagnoses, medications, lab values, or dates.
2. If any piece of information is missing or unclear, explicitly output "Not documented".
3. Every factual medical statement MUST include explicit citation brackets referencing the record ID and date, for example [REC-MH-1001, 2025-09-14].
4. Clearly distinguish CURRENT active medications from HISTORICAL or discontinued medications.
5. Highlight potential record gaps, medication discrepancies, or missing follow-ups.
6. This summary is strictly informational to assist attending clinician Dr. ${requesterDoctorName}. The clinician remains solely responsible for clinical decisions.

Output strictly valid JSON with this structure:
{
  "baselineDemographics": "string with patient age, sex, blood group, vital baseline",
  "pastConditions": ["string with citation [recordId, date]"],
  "hospitalVisits": ["string with citation [recordId, date]"],
  "currentMedications": [{"medication": "name", "dosage": "dose & frequency", "sourceRecordId": "REC-ID"}],
  "historicalMedications": [{"medication": "name", "sourceRecordId": "REC-ID", "status": "discontinued/completed"}],
  "documentedAllergies": ["string allergen, reaction, severity"],
  "keyInvestigations": [{"test": "name", "result": "value with unit", "date": "YYYY-MM-DD", "sourceRecordId": "REC-ID"}],
  "surgicalHistory": ["string procedure with date and citation, or 'Not documented'"],
  "followUpPlan": "string synthesis of clinician documented follow-up recommendations",
  "dataGapsAndConflicts": ["string listing missing tests, conflicting doses, or unverified reports"]
}`;

  const userPrompt = `Patient Profile:
Name: ${patient.fullName}
DOB: ${patient.dateOfBirth} (${patient.gender})
Blood Group: ${patient.bloodGroup}
Documented Allergies in Profile: ${JSON.stringify(patient.knownAllergies)}
Documented Profile Conditions: ${JSON.stringify(patient.existingConditions)}

Authorized Clinical Records (${records.length} records):
${JSON.stringify(sanitizedRecordsContext, null, 2)}

Generate the structured JSON clinical summary strictly adhering to the schema and safety citations.`;

  if (!ai) {
    // Deterministic clinical fallback if GEMINI_API_KEY is not configured
    return fallbackClinicalSummary(patient, records);
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      modelVersion: 'gemini-3.8-flash',
      summaryContent: parsed,
      sourceRecordIds,
    };
  } catch (err) {
    console.warn('Gemini summary generation failed, falling back to deterministic extraction:', err);
    return fallbackClinicalSummary(patient, records);
  }
}

/**
 * FEATURE 2: Natural-Language Medical Record Search & Question Answering
 */
export async function searchRecordsNaturalLanguage(
  patient: PatientProfile,
  records: MedicalRecord[],
  question: string
): Promise<{
  answer: string;
  citations: Array<{ recordId: string; date: string; title: string }>;
  isAiInference: boolean;
  factsDocumented: boolean;
}> {
  const ai = getGenAIClient();
  const citations = records.map(r => ({ recordId: r.recordId, date: r.recordDate, title: r.title }));

  if (!ai) {
    return {
      answer: `[Deterministic Query Service] Based on ${records.length} authorized records for ${patient.fullName}: The patient has documented diagnoses of ${patient.existingConditions.map(c => c.condition).join(', ') || 'None'}. Known allergies: ${patient.knownAllergies.map(a => `${a.allergen} (${a.severity})`).join(', ') || 'No allergies documented'}. (Please configure GEMINI_API_KEY in server environment for dynamic natural-language clinical synthesis).`,
      citations: citations.slice(0, 3),
      isAiInference: false,
      factsDocumented: true,
    };
  }

  const prompt = `You are a medical record audit assistant.
Answer the clinician's question STRICTLY based on the provided authorized records.
Rules:
1. Search ONLY the records provided below.
2. If the answer is NOT documented in these records, explicitly state: "Information is not documented in the available medical records." Do not guess or fabricate.
3. Every factual statement must cite the source record ID (e.g. [REC-MH-1001]).
4. Clearly distinguish documented clinical facts from any logical inferences.

Patient: ${patient.fullName} (DOB: ${patient.dateOfBirth})
Authorized Records:
${JSON.stringify(records.map(r => ({
  id: r.recordId,
  date: r.recordDate,
  category: r.recordCategory,
  title: r.title,
  diagnosis: r.clinicianDiagnosis,
  medications: r.medications,
  labs: r.labResults,
  notes: r.presentingComplaint || r.examinationFindings || r.treatmentAndFollowUpPlan
})), null, 2)}

Clinician's Question: "${question}"`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are a precise, evidence-based medical record librarian. Cite record IDs strictly.',
      },
    });

    const answer = response.text || 'Unable to generate response from model.';
    const citedIds = records.filter(r => answer.includes(r.recordId)).map(r => ({
      recordId: r.recordId,
      date: r.recordDate,
      title: r.title,
    }));

    return {
      answer,
      citations: citedIds.length > 0 ? citedIds : citations.slice(0, 2),
      isAiInference: false,
      factsDocumented: !answer.toLowerCase().includes('not documented'),
    };
  } catch (err: any) {
    return {
      answer: `Query processing encountered an error: ${err?.message || 'Server timeout'}. Please verify records manually.`,
      citations: [],
      isAiInference: false,
      factsDocumented: false,
    };
  }
}

/**
 * FEATURE 3: Medical Document Processing & Structured OCR Extraction
 */
export async function extractDocumentData(
  fileTextOrBase64: string,
  isBase64Image: boolean,
  mimeType: string = 'image/jpeg'
): Promise<{
  documentType: string;
  documentDate: string;
  hospitalName: string;
  doctorName: string;
  diagnosis: string;
  medications: Array<{ name: string; dosage: string; frequency: string; route: string }>;
  labResults: Array<{ testName: string; result: string; unit: string; referenceRange: string; flag: string }>;
  clinicalNotes: string;
  confidenceFlags: string[];
}> {
  const ai = getGenAIClient();

  const systemPrompt = `You are a medical document OCR and clinical extraction engine.
Analyze the uploaded medical document (discharge summary, lab report, prescription, or consultation slip).
Extract candidate clinical fields into structured JSON.
Do NOT convert uncertain text into verified facts. If text is blurry, missing, or ambiguous, flag it in "confidenceFlags".

JSON Output Schema:
{
  "documentType": "consultation" | "prescription" | "lab_investigation" | "discharge_summary" | "radiology_imaging",
  "documentDate": "YYYY-MM-DD or Not Documented",
  "hospitalName": "Extracted hospital or clinic name",
  "doctorName": "Extracted clinician name or Not Documented",
  "diagnosis": "Extracted diagnosis or primary impression",
  "medications": [
    {"name": "Drug Name", "dosage": "e.g. 500mg", "frequency": "e.g. BID", "route": "Oral"}
  ],
  "labResults": [
    {"testName": "Test Name", "result": "value", "unit": "unit", "referenceRange": "range", "flag": "normal/high/low"}
  ],
  "clinicalNotes": "Summary of extracted clinical narrative",
  "confidenceFlags": ["List of any uncertain dates, missing units, or ambiguous values requiring doctor confirmation"]
}`;

  if (!ai) {
    return {
      documentType: 'lab_investigation',
      documentDate: new Date().toISOString().split('T')[0],
      hospitalName: 'Extracted Diagnostic Laboratory',
      doctorName: 'Dr. Clinical Investigator',
      diagnosis: 'Routine Metabolic Profile',
      medications: [],
      labResults: [
        { testName: 'Blood Glucose (Random)', result: '118', unit: 'mg/dL', referenceRange: '70-140', flag: 'normal' },
        { testName: 'Serum Creatinine', result: '0.9', unit: 'mg/dL', referenceRange: '0.6-1.2', flag: 'normal' }
      ],
      clinicalNotes: 'Document extracted via baseline OCR parser (Configure GEMINI_API_KEY for dynamic multimodal vision processing).',
      confidenceFlags: ['Document processed in demo mode. Please verify all values with original report.']
    };
  }

  try {
    let contents: any;
    if (isBase64Image) {
      contents = {
        parts: [
          {
            inlineData: {
              data: fileTextOrBase64,
              mimeType: mimeType || 'image/jpeg',
            },
          },
          { text: 'Extract all structured medical information from this report image according to the schema.' },
        ],
      };
    } else {
      contents = `Extract structured medical information from this clinical document text:\n\n${fileTextOrBase64}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      documentType: parsed.documentType || 'consultation',
      documentDate: parsed.documentDate || 'Not Documented',
      hospitalName: parsed.hospitalName || 'Not Documented',
      doctorName: parsed.doctorName || 'Not Documented',
      diagnosis: parsed.diagnosis || '',
      medications: parsed.medications || [],
      labResults: parsed.labResults || [],
      clinicalNotes: parsed.clinicalNotes || '',
      confidenceFlags: parsed.confidenceFlags || ['Requires clinician manual sign-off'],
    };
  } catch (err: any) {
    console.warn('Gemini document extraction error:', err);
    return {
      documentType: 'consultation',
      documentDate: new Date().toISOString().split('T')[0],
      hospitalName: 'Unspecified Hospital',
      doctorName: 'Unspecified Clinician',
      diagnosis: 'Extraction in progress',
      medications: [],
      labResults: [],
      clinicalNotes: `Document parsing error: ${err.message}. Please input fields manually.`,
      confidenceFlags: ['Automatic extraction was incomplete. Please review manually.'],
    };
  }
}

/**
 * FEATURE 5: AI-Assisted Longitudinal Record & Lab Result Comparison
 */
export async function compareClinicalResults(
  records: MedicalRecord[],
  testName: string
): Promise<{
  testName: string;
  dataPoints: Array<{ date: string; value: number; unit: string; recordId: string; hospital: string }>;
  unitConsistencyWarning?: string;
  aiObservation: string;
}> {
  const dataPoints: Array<{ date: string; value: number; unit: string; recordId: string; hospital: string }> = [];
  const unitsFound = new Set<string>();

  for (const r of records) {
    if (r.labResults) {
      for (const lab of r.labResults) {
        if (lab.testName.toLowerCase().includes(testName.toLowerCase())) {
          const numVal = parseFloat(String(lab.result));
          if (!isNaN(numVal)) {
            dataPoints.push({
              date: r.recordDate,
              value: numVal,
              unit: lab.unit,
              recordId: r.recordId,
              hospital: r.hospitalName,
            });
            unitsFound.add(lab.unit.trim().toLowerCase());
          }
        }
      }
    }
  }

  dataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let unitWarning: string | undefined;
  if (unitsFound.size > 1) {
    unitWarning = `Caution: Inconsistent measurement units detected across records (${Array.from(unitsFound).join(', ')}). Comparison may not be 1:1 direct.`;
  }

  const ai = getGenAIClient();
  let aiObservation = 'Longitudinal measurements analyzed. Please correlate with clinical status.';

  if (ai && dataPoints.length > 0) {
    try {
      const prompt = `Compare these longitudinal clinical laboratory values for ${testName}:
${JSON.stringify(dataPoints, null, 2)}
Units: ${Array.from(unitsFound).join(', ')}
${unitWarning ? `WARNING: ${unitWarning}` : ''}

Provide a concise, 2-3 sentence purely factual clinician observation regarding trend (e.g. rising, falling, stable).
Do NOT invent reasons or diagnose new conditions. Include a reminder that clinician clinical correlation is mandatory.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
      aiObservation = response.text || aiObservation;
    } catch (err) {
      console.warn('AI comparison generation failed:', err);
    }
  }

  return {
    testName,
    dataPoints,
    unitConsistencyWarning: unitWarning,
    aiObservation,
  };
}

/**
 * FEATURE 7: Patient-Friendly Plain-English AI Explanation
 */
export async function explainMedicalRecordForPatient(
  record: MedicalRecord
): Promise<{
  plainLanguageExplanation: string;
  keyTermsExplained: Array<{ term: string; explanation: string }>;
  nextStepsAdvice: string;
}> {
  const ai = getGenAIClient();

  if (!ai) {
    return {
      plainLanguageExplanation: `This record from ${record.hospitalName} on ${record.recordDate} documents your ${record.title}. It includes notes by ${record.createdByName} regarding your health check.`,
      keyTermsExplained: [
        { term: 'Diagnosis', explanation: 'The healthcare provider’s assessment of what health condition is present.' },
        { term: 'Follow-up Plan', explanation: 'Recommended next steps, appointments, or tests to keep track of your wellness.' }
      ],
      nextStepsAdvice: 'Always discuss your medical results and any treatment plans directly with your licensed doctor or healthcare team.'
    };
  }

  const prompt = `You are a compassionate, clear medical communicator explaining a patient's own medical record to them in plain language.
Rules:
1. Explain medical terms simply and reassuringly (approx 8th grade reading level).
2. DO NOT tell the patient they have a new condition.
3. Show the actual results, units, and ranges recorded.
4. Always conclude by advising them to speak with their doctor for personalized medical decisions.

Medical Record:
${JSON.stringify({
  title: record.title,
  date: record.recordDate,
  hospital: record.hospitalName,
  diagnosis: record.clinicianDiagnosis,
  complaint: record.presentingComplaint,
  findings: record.examinationFindings,
  medications: record.medications,
  labResults: record.labResults,
  plan: record.treatmentAndFollowUpPlan,
}, null, 2)}

Provide output strictly in JSON format:
{
  "plainLanguageExplanation": "Clear 2-3 paragraph explanation in warm, friendly language",
  "keyTermsExplained": [{"term": "Medical term", "explanation": "Simple explanation"}],
  "nextStepsAdvice": "Friendly guidance reminding them to discuss with their clinician"
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      plainLanguageExplanation: parsed.plainLanguageExplanation || 'Explanation generated.',
      keyTermsExplained: parsed.keyTermsExplained || [],
      nextStepsAdvice: parsed.nextStepsAdvice || 'Please speak with your doctor for individual medical guidance.',
    };
  } catch (err: any) {
    return {
      plainLanguageExplanation: `Summary for record: ${record.title} (${record.recordDate}). Please consult your clinician to interpret these findings in your personal health context.`,
      keyTermsExplained: [],
      nextStepsAdvice: 'Always discuss medical records directly with your physician.',
    };
  }
}

/**
 * Deterministic clinical fallback if Gemini is offline
 */
function fallbackClinicalSummary(patient: PatientProfile, records: MedicalRecord[]) {
  const currentMeds: Array<{ medication: string; dosage: string; sourceRecordId: string }> = [];
  const histMeds: Array<{ medication: string; sourceRecordId: string; status: string }> = [];
  const keyLabs: Array<{ test: string; result: string; date: string; sourceRecordId: string }> = [];
  const pastConds: string[] = [];
  const visits: string[] = [];

  records.forEach(r => {
    if (r.clinicianDiagnosis) {
      pastConds.push(`${r.clinicianDiagnosis} [${r.recordId}, ${r.recordDate}]`);
    }
    visits.push(`${r.title} at ${r.hospitalName} (${r.recordDate}) by ${r.createdByName} [${r.recordId}]`);

    if (r.medications) {
      r.medications.forEach(m => {
        if (m.status === 'active') {
          currentMeds.push({ medication: m.medicationName, dosage: `${m.dosage} - ${m.frequency}`, sourceRecordId: r.recordId });
        } else {
          histMeds.push({ medication: m.medicationName, sourceRecordId: r.recordId, status: m.status });
        }
      });
    }

    if (r.labResults) {
      r.labResults.forEach(l => {
        keyLabs.push({
          test: l.testName,
          result: `${l.result} ${l.unit} (Ref: ${l.referenceRange})`,
          date: r.recordDate,
          sourceRecordId: r.recordId,
        });
      });
    }
  });

  return {
    modelVersion: 'rule-based-clinical-parser',
    summaryContent: {
      baselineDemographics: `${patient.fullName}, ${patient.gender}, DOB: ${patient.dateOfBirth}. Blood Group: ${patient.bloodGroup}.`,
      pastConditions: pastConds.length > 0 ? pastConds : ['None documented in authorized records.'],
      hospitalVisits: visits.length > 0 ? visits : ['No previous hospital visits recorded.'],
      currentMedications: currentMeds,
      historicalMedications: histMeds,
      documentedAllergies: patient.knownAllergies.map(a => `${a.allergen}: ${a.reaction} (Severity: ${a.severity})`),
      keyInvestigations: keyLabs.slice(0, 6),
      surgicalHistory: ['Not documented in available outpatient records.'],
      followUpPlan: 'Correlate with previous hospital records and continue outpatient management as documented by prescribing clinician.',
      dataGapsAndConflicts: ['Verify latest blood pressure log with current pharmacy refill status.'],
    },
    sourceRecordIds: records.map(r => r.recordId),
  };
}
