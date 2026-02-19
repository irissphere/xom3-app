export type TenantTheme = {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  domain: string;
  route?: string; // Optional route for domain-specific routing
};
