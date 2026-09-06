import { masterHandlers } from '../_lib/master';
import { EMPLOYEES } from '../_lib/configs';
const h = masterHandlers(EMPLOYEES);
export const GET = h.list;
export const POST = h.create;
