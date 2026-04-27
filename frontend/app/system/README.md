System route namespace for the admin portal.

- Public URL space: `/system/*`
- Implemented by middleware rewrite to `/admin/*`
- This keeps admin URL separation for subdomain hosting without duplicating app files.
