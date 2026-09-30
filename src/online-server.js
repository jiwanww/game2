// Public server used only by the GitHub Pages web app.
// The desktop app keeps its own local server unless a user connects elsewhere.
export const PUBLIC_MATCH_SERVER=''; // No public server has been deployed. New Wi-Fi rooms use WebRTC.
export function defaultMatchServer(){return location.hostname==='jiwanww.github.io'?PUBLIC_MATCH_SERVER:'';}
