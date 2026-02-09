export interface BaseData {
  FIRST_NAME: string;
  LAST_NAME: string;
  DIRECT_NUMBER: string;
  MOBILE_PHONE: string;
  PERSONAL_ADDRESS: string;
  PERSONAL_CITY: string;
  PERSONAL_PHONE: string;
  PERSONAL_STATE: string;
  PERSONAL_ZIP: string;
  PERSONAL_ZIP4: string;
  LAST_UPDATED: string;
  PERSONAL_EMAIL: string;
  BUSINESS_EMAIL: string;
  LINKEDIN_URL: string;
  HOMEOWNER: string;
  SHA256_PERSONAL_EMAIL: string;
  SKIPTRACE_B2B_PHONE: string;
  PERSONAL_VERIFIED_EMAILS: string;
  BUSINESS_VERIFIED_EMAILS: string;
  FACEBOOK_URL: string;
  TWITTER_URL: string;
  SKIPTRACE_ADDRESS: string;
  SKIPTRACE_B2B_ADDRESS: string;
  SKIPTRACE_CITY: string;
}

export interface B2BData extends BaseData {
  COMPANY_NAME: string;
  COMPANY_INDUSTRY: string;
  COMPANY_DESCRIPTION: string;
  COMPANY_DOMAIN: string;
  COMPANY_EMPLOYEE_COUNT: string;
  COMPANY_LINKEDIN_URL: string;
  COMPANY_PHONE: string;
  COMPANY_REVENUE: string;
  COMPANY_SIC: string;
  COMPANY_NAICS: string;
  COMPANY_CITY: string;
  COMPANY_STATE: string;
  COMPANY_ZIP: string;
  DEPARTMENT: string;
  JOB_TITLE: string;
  SENIORITY_LEVEL: string;
  JOB_TITLE_LAST_UPDATED: string;
  BUSINESS_EMAIL_VALIDATION_STATUS: string;
}

export interface B2CData extends BaseData {
  SOCIAL_CONNECTIONS: string;
  AGE_RANGE: string;
  CHILDREN: string;
  GENDER: string;
  MARRIED: string;
  NET_WORTH: string;
  INCOME_RANGE: string;
  ADDITIONAL_PERSONAL_EMAILS: string;
  PERSONAL_EMAIL_VALIDATION_STATUS: string;
  PERSONAL_EMAIL_LAST_SEEN: string;
  SKIPTRACE_CREDIT_RATING: string;
}

export type DatasetType = 'b2b' | 'b2c';
