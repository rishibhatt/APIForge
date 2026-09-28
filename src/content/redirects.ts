export interface RedirectMapping {
  from: string;
  to: string;
  permanent: boolean;
}

export const CANONICAL_REDIRECTS: RedirectMapping[] = [
  {
    from: "/guides/swagger-validation",
    to: "/guides/validate-swagger-openapi-spec",
    permanent: true,
  },
  {
    from: "/resources/guides",
    to: "/guides",
    permanent: true,
  },
  {
    from: "/resources/glossary",
    to: "/glossary",
    permanent: true,
  },
];
