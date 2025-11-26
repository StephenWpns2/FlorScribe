import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FhirMapperService {
  mapToFhirBundle(
    extraction: any,
    patientId: string,
    practitionerId: string,
  ): any {
    const bundleId = uuidv4();
    const timestamp = new Date().toISOString();

    const entries: any[] = [];

    // Map problems to Conditions
    if (extraction.problems) {
      for (const problem of extraction.problems) {
        const condition = this.createCondition(
          problem,
          patientId,
          practitionerId,
          timestamp,
        );
        entries.push({
          fullUrl: `urn:uuid:${uuidv4()}`,
          resource: condition,
        });
      }
    }

    // Map medications to MedicationRequests
    if (extraction.medications) {
      for (const medication of extraction.medications) {
        const medRequest = this.createMedicationRequest(
          medication,
          patientId,
          practitionerId,
          timestamp,
        );
        entries.push({
          fullUrl: `urn:uuid:${uuidv4()}`,
          resource: medRequest,
        });
      }
    }

    // Map vitals to Observations
    if (extraction.vitals) {
      for (const vital of extraction.vitals) {
        const observation = this.createObservation(
          vital,
          patientId,
          practitionerId,
          timestamp,
        );
        entries.push({
          fullUrl: `urn:uuid:${uuidv4()}`,
          resource: observation,
        });
      }
    }

    // Map orders to ServiceRequests
    if (extraction.orders) {
      for (const order of extraction.orders) {
        const serviceRequest = this.createServiceRequest(
          order,
          patientId,
          practitionerId,
          timestamp,
        );
        entries.push({
          fullUrl: `urn:uuid:${uuidv4()}`,
          resource: serviceRequest,
        });
      }
    }

    return {
      resourceType: 'Bundle',
      id: bundleId,
      type: 'transaction',
      timestamp,
      entry: entries,
    };
  }

  private createCondition(problem: any, patientId: string, practitionerId: string, timestamp: string): any {
    const coding: any[] = [];
    if (problem.icd10_code) {
      coding.push({
        system: 'http://hl7.org/fhir/sid/icd-10-cm',
        code: problem.icd10_code,
        display: problem.description,
      });
    }

    return {
      resourceType: 'Condition',
      id: uuidv4(),
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active',
            display: 'Active',
          },
        ],
      },
      verificationStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
            code: 'confirmed',
            display: 'Confirmed',
          },
        ],
      },
      category: [
        {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: '439401001',
              display: 'Diagnosis',
            },
          ],
        },
      ],
      code: {
        coding,
        text: problem.description,
      },
      subject: {
        reference: `Patient/${patientId}`,
      },
      recorder: {
        reference: `Practitioner/${practitionerId}`,
      },
      recordedDate: timestamp,
    };
  }

  private createMedicationRequest(medication: any, patientId: string, practitionerId: string, timestamp: string): any {
    const dosageInstruction: any[] = [];
    if (medication.dosage || medication.frequency) {
      dosageInstruction.push({
        text: `${medication.dosage || ''} ${medication.frequency || ''}`.trim(),
        route: medication.route
          ? {
              coding: [
                {
                  system: 'http://snomed.info/sct',
                  code: this.mapRouteToSnomed(medication.route),
                  display: medication.route,
                },
              ],
            }
          : undefined,
      });
    }

    return {
      resourceType: 'MedicationRequest',
      id: uuidv4(),
      status: 'active',
      intent: 'order',
      medicationCodeableConcept: {
        text: medication.normalized_name || medication.name,
      },
      subject: {
        reference: `Patient/${patientId}`,
      },
      requester: {
        reference: `Practitioner/${practitionerId}`,
      },
      dosageInstruction,
      authoredOn: timestamp,
    };
  }

  private createObservation(vital: any, patientId: string, practitionerId: string, timestamp: string): any {
    return {
      resourceType: 'Observation',
      id: uuidv4(),
      status: 'final',
      code: {
        text: vital.type,
      },
      subject: {
        reference: `Patient/${patientId}`,
      },
      performer: [
        {
          reference: `Practitioner/${practitionerId}`,
        },
      ],
      valueString: vital.value,
      effectiveDateTime: timestamp,
    };
  }

  private createServiceRequest(order: any, patientId: string, practitionerId: string, timestamp: string): any {
    const coding: any[] = [];
    if (order.cpt_code) {
      coding.push({
        system: 'http://www.ama-assn.org/go/cpt',
        code: order.cpt_code,
        display: order.description,
      });
    }

    return {
      resourceType: 'ServiceRequest',
      id: uuidv4(),
      status: 'active',
      intent: 'order',
      code: {
        coding,
        text: order.description,
      },
      subject: {
        reference: `Patient/${patientId}`,
      },
      requester: {
        reference: `Practitioner/${practitionerId}`,
      },
      authoredOn: timestamp,
    };
  }

  private mapRouteToSnomed(route: string): string {
    const routeMap: Record<string, string> = {
      oral: '26643006',
      intravenous: '47625008',
      intramuscular: '78421000',
      subcutaneous: '34206005',
      topical: '6064005',
    };
    return routeMap[route?.toLowerCase()] || '26643006'; // Default to oral
  }
}

