import {readFile,writeFile,cp,mkdir} from 'node:fs/promises';import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'../..');
const target=join(root,'dist/windows/win-unpacked');await mkdir(target,{recursive:true});
await cp(join(root,'APP-RELEASE-GUIDE.md'),join(target,'APP-RELEASE-GUIDE.md'));
await writeFile(join(target,'READ-ME-FIRST.txt'),'능력전선 0.7.1 베타 Windows 테스트 앱\r\n\r\n압축을 완전히 푼 뒤 Ability Front.exe를 실행하세요. 폴더 안의 다른 파일도 함께 필요합니다.\r\n기존 START-WINDOWS.bat 서버는 종료해 주세요. Node.js는 필요하지 않습니다.\r\n\r\n이 압축본은 자동 업데이트가 아직 활성화되지 않은 미서명 테스트 빌드입니다.\r\n정식 자동 업데이트에는 HTTPS 배포 주소를 연결하여 만든 NSIS 설치판이 필요합니다.\r\nAndroid/iOS 스토어판은 별도 소스 프로젝트에 포함돼 있으며 아직 스토어 등록 전입니다.\r\n');
console.log('Windows preview readme prepared.');
