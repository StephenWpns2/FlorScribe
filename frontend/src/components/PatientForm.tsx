import { useState, type FormEvent } from 'react';
import type { CreatePatientDto, UpdatePatientDto, Patient } from '../types/patient';

interface PatientFormProps {
  patient?: Patient;
  onSubmit: (data: CreatePatientDto | UpdatePatientDto) => Promise<void>;
  onCancel?: () => void;
}

export default function PatientForm({ patient, onSubmit, onCancel }: PatientFormProps) {
  const [formData, setFormData] = useState<CreatePatientDto | UpdatePatientDto>({
    firstName: patient?.firstName || '',
    lastName: patient?.lastName || '',
    phoneNumber: patient?.phoneNumber || '',
    email: patient?.email || '',
    dateOfBirth: patient?.dateOfBirth || '',
    gender: patient?.gender || '',
    address: patient?.address || '',
    nationalId: patient?.nationalId || '',
    ethnicity: patient?.ethnicity || '',
    pastMedicalHistory: patient?.pastMedicalHistory || '',
    familyMedicalHistory: patient?.familyMedicalHistory || '',
    currentMedications: patient?.currentMedications || '',
    allergies: patient?.allergies || '',
    pastSurgeries: patient?.pastSurgeries || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.phoneNumber?.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error: any) {
      setErrors({ submit: error.response?.data?.message || 'Failed to save patient' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#42D7D7] ${
              errors.firstName ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#42D7D7] ${
              errors.lastName ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            required
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#42D7D7] ${
              errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#42D7D7]"
          />
        </div>

        <div>
          <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="dateOfBirth"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#42D7D7]"
          />
        </div>

        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#42D7D7]"
          >
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#42D7D7]"
          />
        </div>

        <div>
          <label htmlFor="nationalId" className="block text-sm font-medium text-gray-700 mb-1">
            National ID / Passport
          </label>
          <input
            type="text"
            id="nationalId"
            name="nationalId"
            value={formData.nationalId}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#42D7D7]"
          />
        </div>

        <div>
          <label htmlFor="ethnicity" className="block text-sm font-medium text-gray-700 mb-1">
            Ethnicity
          </label>
          <input
            type="text"
            id="ethnicity"
            name="ethnicity"
            value={formData.ethnicity}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#42D7D7]"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="pastMedicalHistory" className="block text-sm font-medium text-gray-700 mb-1">
            Past Medical History
          </label>
          <textarea
            id="pastMedicalHistory"
            name="pastMedicalHistory"
            value={formData.pastMedicalHistory}
            onChange={handleChange}
            rows={3}
            placeholder="e.g., diabetes, hypertension, allergies, surgeries"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#42D7D7]"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="familyMedicalHistory" className="block text-sm font-medium text-gray-700 mb-1">
            Family Medical History
          </label>
          <textarea
            id="familyMedicalHistory"
            name="familyMedicalHistory"
            value={formData.familyMedicalHistory}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#42D7D7]"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="currentMedications" className="block text-sm font-medium text-gray-700 mb-1">
            Current Medications
          </label>
          <textarea
            id="currentMedications"
            name="currentMedications"
            value={formData.currentMedications}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#42D7D7]"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 mb-1">
            Allergies
          </label>
          <textarea
            id="allergies"
            name="allergies"
            value={formData.allergies}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#42D7D7]"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="pastSurgeries" className="block text-sm font-medium text-gray-700 mb-1">
            Past Surgeries or Hospitalizations
          </label>
          <textarea
            id="pastSurgeries"
            name="pastSurgeries"
            value={formData.pastSurgeries}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#42D7D7]"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 rounded-md text-white font-medium transition-colors"
          style={{ backgroundColor: '#42D7D7' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3BC5C5'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#42D7D7'}
        >
          {loading ? 'Saving...' : patient ? 'Update Patient' : 'Create Patient'}
        </button>
      </div>
    </form>
  );
}

