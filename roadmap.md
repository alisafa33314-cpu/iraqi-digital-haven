# Backend connection update

- [x] Update Vercel public/server connection settings and remove custom hardcoded old connection values.
- [x] Point Google sign-in on the store domain back to https://fpistor.com.
- [x] Test connection configuration and check the new provider endpoint.
- [ ] Verify Vercel production after redeployment (requires deployment access).
- [ ] Verify privileged server features against the new project (requires its server-only credential and migrated schema/data).
- [ ] Restore catalog on Vercel: new project lacks products.old_price and categories, and public products query returns no rows; requires migrating store schema/data to the external project, which is not accessible through this project's managed connection.