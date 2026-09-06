import { masterHandlers } from '../../_lib/master';
import { VENDORS } from '../../_lib/configs';
const h = masterHandlers(VENDORS);
export const GET = h.get;
export const PATCH = h.update;
export const DELETE = h.remove;
