// XOM3 Healthcare Client - Target Schema
// This is the **target truth** everything must conform to

export type Xom3Client = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: string;
  createdAt: string;
};
