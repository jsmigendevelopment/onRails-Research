# Recipe: TanStack Form

Load with an issue whose `Recipes:` line says `form`: any form with more than a search box. The kit's default for forms in any web app.

## The official prompt

> Build a TanStack Form experience for a TypeScript app. Use typed form and field APIs, synchronous and debounced async validators, deeply nested object and array fields, and granular subscriptions so only relevant UI updates. Keep it headless and render accessible, product-specific controls.

Source: tanstack.com/form, "Copy Form prompt" (`TanStack/tanstack.com` `src/components/landing/FormLanding.tsx`, commit `bc3e24a`), read 2026-11-23.

## Version

`@tanstack/react-form` **1.33.5** on npm, checked 2026-11-23 (MIT, React 17 to 19; depends on `@tanstack/form-core` 1.33.5 and `@tanstack/react-store` ^0.11). Install with `pnpm add -E @tanstack/react-form@<version>`. The pack uses 1.33.5.

## API check

Read in `TanStack/form` at `5de1a8d` (2026-11-21). Present: `useForm` (`defaultValues`, `validators`, `onSubmit`, `onSubmitInvalid`), `form.Field` (`name`, `validators` with `onChange`, `onBlur`, `onSubmit`, `onChangeAsync`, `onChangeAsyncDebounceMs`), array fields (`mode="array"`, `pushValue`, `removeValue`), nested names (`'people[0].name'`), `form.Subscribe` with a `selector`, `useSelector`, `formApi.setFieldMeta` and `reset`, Standard Schema validators (a Zod schema works directly). `useStore` still exists but is deprecated in favour of `useSelector`. `createServerValidate` exists for Start server validation; the kit's controllers already validate on the server, so it isn't needed.

## The kit's rules on top

- **The form error pattern** (the pack's `note-create-form.tsx` is the example): a visible `<label>`; on a failed submit the field gets `aria-invalid`, its message is linked with `aria-describedby` (`FieldError`), and focus moves to the first invalid field (`onSubmitInvalid`). Form-level failures go to a `role="alert"` region that exists before it is filled. Native validation stays on in the server HTML and is turned off once hydrated.
- **One schema, both sides:** client validators use the module's Zod schema (`schemas.ts`), so messages match the server's. A server field error lands on the same field (`setFieldMeta(name, meta => ({ ...meta, errorMap: { ...meta.errorMap, onSubmit: message } }))`).
- **Validators only where they help:** `onSubmit` by default; `onChange` or `onBlur` for fields where early feedback helps; async validators (a uniqueness check) with `onChangeAsyncDebounceMs` of 300 to 500 ms and the request cancelled through the signal.
- **Granular subscriptions:** read state in `form.Subscribe` or `useSelector` where it renders (the submit button's `isSubmitting`), not by re-rendering the whole form.
- **Controls** are the UI kit's (`Input`, `Button`, shadcn/ui), with design tokens. No raw `<input>` styling.
- **Load forms lazily** when the page doesn't need them for its first paint: Form plus the client-side Zod check is about 37 KB gzip. The pack's `lazy-note-forms.tsx` shows a skeleton in the form's shape while the chunk loads.
- A search box that only writes the URL doesn't need a form library: an uncontrolled field and `navigate({ search })` (the notes filter).

## Done when

- [ ] Every field has a visible label; errors are linked, announced and focused (an e2e test in `e2e/a11y.spec.ts` style: empty submit, server field error, form-level error, axe clean in each).
- [ ] Client and server use the same schema, and a test proves the messages match.
- [ ] Async validators are debounced and cancelled; no request per keystroke.
- [ ] The submit button is disabled or marked busy while submitting, and a double submit sends one request.
- [ ] Only the parts that change re-render (subscriptions, not whole-form state reads).
