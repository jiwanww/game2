# 능력전선 Windows 프로그램 배포

0.7.2 변경 및 단계별 배포 안내: [UPDATE-0.7.2.md](UPDATE-0.7.2.md)

## 1. 설치 파일 만들기

GitHub Desktop으로 이 업데이트를 `main`에 올린 뒤 GitHub 저장소의 **Actions** 탭을 연다.

1. 왼쪽의 **Windows Release**를 선택한다.
2. **Run workflow**를 누른다.
3. 완료될 때까지 기다린다.
4. 저장소 오른쪽의 **Releases**에서 `Ability Front Beta`를 열고 `AbilityFront-Setup-...exe` 설치 파일을 내려받아 설치한다.

이 설치판은 `jiwanww/game2`의 `latest` Release에서 새 버전을 확인한다. 다음 버전은 `package.json`의 version과 `apps/release-config.json`의 buildNumber를 올린 뒤 새 `v...` 태그로 빌드한다.

## 2. 멀티플레이

같은 와이파이에서는 프로그램을 실행한 방장이 사용자설정 방을 만들고, 친구가 방장의 PC 주소와 방 코드로 참가한다.

다른 집 친구와 하려면 방장 메인 화면 또는 상단 메뉴의 **인터넷 초대 시작 / 주소 복사**를 누른다. 표시·복사한 HTTPS 주소와 방 코드를 친구에게 보낸다. 친구는 자기 앱의 **친구 서버 주소 입력**으로 연결한다. 사용자설정과 협동 던전 모두 지원하며, 주소는 방장 프로그램을 켜 둔 동안에만 유효하다.
