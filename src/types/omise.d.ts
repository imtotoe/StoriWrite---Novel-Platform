declare module "omise" {
  interface OmiseConfig {
    publicKey?: string;
    secretKey?: string;
  }

  interface OmiseSource {
    id: string;
    type: string;
    scannable_code?: {
      image?: {
        download_uri?: string;
      };
    };
  }

  interface OmiseCharge {
    id: string;
    status: string;
    amount: number;
    currency: string;
    source?: OmiseSource;
    authorize_uri?: string;
    expires_at?: string;
    metadata?: Record<string, unknown>;
  }

  interface OmiseInstance {
    sources: {
      create(params: Record<string, unknown>): Promise<OmiseSource>;
    };
    charges: {
      create(params: Record<string, unknown>): Promise<OmiseCharge>;
      retrieve(id: string): Promise<OmiseCharge>;
    };
  }

  function Omise(config: OmiseConfig): OmiseInstance;
  export default Omise;
}
