import { masterHandlers } from '../_lib/master';
import { ITEMS } from '../_lib/configs';
const h = masterHandlers(ITEMS);
export const GET = h.list;
export const POST = h.create;
