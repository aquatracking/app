import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

export default {
  tables: {
    vivariums: {
      columns: {
        /**
         * PostgreSQL returns "numeric" as a string, to keep its precision:
         * a volume with one decimal fits a JavaScript number.
         */
        volume_liters: {
          tsType: 'number',
          decorators: [
            {
              name: '@column',
              args: { consume: (value: string | null) => (value === null ? null : Number(value)) },
            },
          ],
        },
      },
    },
  },
} satisfies SchemaRules
