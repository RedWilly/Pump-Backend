# Creating/Recreating Database Structure from Scratch

1. **Ensure your schema.prisma file is up to date**
   
   Make sure your `schema.prisma` file accurately reflects the database structure you want to create. This file should be in your project root or in a `prisma` directory.

2. **Generate a new migration**

   Run the following command in your terminal:

   ```
   npx prisma migrate dev --name init
   ```

   This will:
   - Create a new `migrations` directory (if it doesn't exist)
   - Generate a new migration file based on your current schema
   - Apply this migration to your database

3. **Verify the migration**

   Prisma will show you the SQL it plans to execute. Review this to ensure it matches your expectations.

4. **Apply the migration**

   If everything looks correct, Prisma will ask if you want to apply the migration. Type 'y' and press Enter.

5. **Generate Prisma Client**

   After the migration is applied, Prisma will automatically regenerate the Prisma Client. If it doesn't, you can run:

   ```
   npx prisma generate
   ```

6. **Verify the database structure**

   You can use Prisma Studio to visually inspect your database:

   ```
   npx prisma studio
   ```

   This will open a web interface where you can view your database structure and any data.

7. **Seed the database (optional)**

   If you have a seed script, you can run it now to populate your database with initial data:

   ```
   npx prisma db seed
   ```

   Note: Make sure you have configured the seed script in your `package.json`:

   ```json
   {
     "prisma": {
       "seed": "ts-node prisma/seed.ts"
     }
   }
   ```

8. **Commit your changes**

   Don't forget to commit your new migration files to version control.

Remember:
- Always backup your data before performing major database operations.
- In a team environment, communicate these changes to your colleagues.
- If you're working with a production database, always test these operations in a staging environment first.