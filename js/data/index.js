// Topic registry: order here is the order in the menu and on the home page.
//
// Shape of a topic module:
//   { id, title, icon, color, description, useCases[],
//     subtopics: [{ id, title, icon, summary, description, useCases[],
//                   sections: [{ title, note?, cmds: [{ d, c }] }] }] }
// `d` is a one-line description, `c` the command(s). Backticks in prose
// render as inline code.
import start from './start.js';
import storage from './storage.js';
import compute from './compute.js';
import iam from './iam.js';
import data from './data.js';
import apis from './apis.js';

export const topics = [start, storage, compute, iam, data, apis];
