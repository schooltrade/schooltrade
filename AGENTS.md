# Project rules

- Parse content-filter results through `src/lib/moderationResult.ts`; failed requests, invalid responses and backend rejections must not authorize publication. The pure decision module keeps this security boundary directly testable.