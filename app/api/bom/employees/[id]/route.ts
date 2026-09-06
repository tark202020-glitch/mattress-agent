import { masterHandlers } from '../../_lib/master';
import { EMPLOYEES } from '../../_lib/configs';
const h = masterHandlers(EMPLOYEES);
export const GET = h.get;
export const PATCH = h.update;
export const DELETE = h.remove;
