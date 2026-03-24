/**
 * Medication interface
 */
export interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  instructions: string;
  taken: boolean;
  takenAt?: string;
}

/**
 * Patient interface
 */
export interface Patient {
  id: string;
  name: string;
  age: number;
  medications: Medication[];
}

/**
 * Mock patient data: Mr. Sharma
 */
export const mockPatient: Patient = {
  id: 'patient-001',
  name: 'Mr. Sharma',
  age: 72,
  medications: [
    {
      id: 'med-001',
      name: 'Metformin',
      dosage: '500mg',
      time: '9 AM',
      instructions: 'Take with breakfast. Do not take on an empty stomach.',
      taken: false,
    },
    {
      id: 'med-002',
      name: 'Amlodipine',
      dosage: '5mg',
      time: '2 PM',
      instructions: 'Take with or without food. Take at the same time each day.',
      taken: false,
    },
    {
      id: 'med-003',
      name: 'Aspirin',
      dosage: '75mg',
      time: '9 PM',
      instructions: 'Take with a full glass of water after meals.',
      taken: false,
    },
  ],
};

/**
 * Mark a medication as taken
 */
export function markMedicationTaken(
  patient: Patient,
  medicationId: string
): boolean {
  const medication = patient.medications.find((med) => med.id === medicationId);
  
  if (!medication) {
    return false;
  }

  medication.taken = true;
  medication.takenAt = new Date().toISOString();
  return true;
}

/**
 * Get medications due now based on current time
 */
export function getMedicationsDueNow(patient: Patient): Medication[] {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  return patient.medications.filter((med) => {
    if (med.taken) return false;

    // Parse time (e.g., "9 AM", "2 PM", "9 PM")
    const timeMatch = med.time.match(/(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return false;

    let hour = parseInt(timeMatch[1]);
    const period = timeMatch[2].toUpperCase();

    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;

    const medTime = hour * 60;
    
    // Consider medication due if within ±30 minutes of current time
    return Math.abs(currentTime - medTime) <= 30;
  });
}
