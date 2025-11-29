import { CrmAdapter, CrmType } from '../types';
import { SalesforceAdapter } from './salesforce';
import { HubSpotAdapter } from './hubspot';
import { PipedriveAdapter } from './pipedrive';

export class CrmAdapterFactory {
  static createAdapter(crmType: CrmType): CrmAdapter {
    switch (crmType) {
      case 'SALESFORCE':
        return new SalesforceAdapter();
      case 'HUBSPOT':
        return new HubSpotAdapter();
      case 'PIPEDRIVE':
        return new PipedriveAdapter();
      default:
        throw new Error(`Unsupported CRM type: ${crmType}`);
    }
  }

  static getSupportedCrmTypes(): CrmType[] {
    return ['SALESFORCE', 'HUBSPOT', 'PIPEDRIVE'];
  }
}

export { SalesforceAdapter, HubSpotAdapter, PipedriveAdapter };