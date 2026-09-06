import { masterHandlers } from '../_lib/master';
import { VENDORS } from '../_lib/configs';
const h = masterHandlers(VENDORS);
export const GET = h.list;
export const POST = h.create;
