// Public server used only by the GitHub Pages web app.
// The desktop app keeps its own local server unless a user connects elsewhere.
export const PUBLIC_MATCH_SERVER='https://ability-front-jiwanww.onrender.com';
export function defaultMatchServer(){return location.hostname==='jiwanww.github.io'?PUBLIC_MATCH_SERVER:'';}
