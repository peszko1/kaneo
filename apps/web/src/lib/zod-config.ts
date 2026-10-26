import { z } from "zod";

// Zod probes for JIT support with `Function("")`, which the CSP forbids and
// reports on every load. The non-JIT path is fast enough for our forms.
z.config({ jitless: true });
