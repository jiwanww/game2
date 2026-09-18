# 능력전선 0.7.1 베타 · 앱 제작과 업데이트 안내

## 이번 변경

- 몬스터 출현, 공격 준비, 처치에 서로 다른 합성 효과음을 추가했습니다. 보스는 더 낮고 긴 출현·공격음을 사용합니다.
- 스테이지 클리어 성공음을 모든 팀원에게 재생하고, 화면 중앙의 `승리`를 3초간 표시합니다. 이때 전투·제한 시간은 멈추고 보상 선택도 차단됩니다. 이후 강화 선택으로 전환됩니다. 최종 보스도 같은 연출 뒤 해금 보상으로 이동합니다.
- 모바일 이동 스틱, 시점 드래그, 공격·보조 공격, Q/E/C/R 홀드·해제, 점프, 대시, 상호작용, 걷기·앉기 버튼을 추가했습니다. 오른쪽 화면 또는 공격 버튼 위에서 드래그할 수 있습니다. 당기기를 누른 채 드래그하고 놓으면 거미줄 투척에 연결됩니다.
- PC의 기존 해상도, 안티앨리어싱, 실시간 그림자 설정은 변경하지 않았습니다.

## 무엇이 준비되어 있나요?

| 항목 | 현재 상태 |
| --- | --- |
| 기존 HTML / LAN 게임 | 수정 사항 반영. 기존 실행 방법 그대로 사용 가능 |
| Windows 테스트 앱 | Electron + 게임 서버 포함. 압축을 푼 뒤 `Ability Front.exe` 실행. 사용자에게 Node.js 설치 불필요 |
| Windows 설치판 / 자체 업데이트 | 코드와 빌드 스크립트 준비. 이 작업 환경에는 Wine이 없고 추가 설치 권한이 없어 NSIS 설치 파일 생성은 완료하지 못함. Windows PC에서 아래 절차로 생성 필요 |
| Android | Capacitor 네이티브 프로젝트, 터치 UI, 버전·서명 빌드 설정 준비. Android SDK/JDK 21 및 서명된 AAB 생성과 Google Play 등록 필요 |
| iOS | Xcode 프로젝트와 Swift Package Manager 설정 준비. Mac/Xcode와 앱 서명, App Store Connect 등록 필요 |

**Windows 테스트 압축본의 자동 업데이트는 아직 활성화되지 않았습니다.** 배포 서버 주소와 스토어 계정이 연결되지 않았으며, 어느 스토어에도 이 작업에서 업로드하지 않았습니다. Android APK/AAB, iOS IPA를 생성·검증했다고 주장하지 않습니다.

## 지금 Windows에서 플레이하기

1. `AbilityFront-Windows-Preview.zip`을 새 폴더에 완전히 압축 해제합니다.
2. 기존 `START-WINDOWS.bat` 서버가 켜져 있다면 종료합니다. 같은 8787번 포트를 사용합니다.
3. 폴더 안의 `Ability Front.exe`를 실행합니다. 실행 파일 하나만 다른 곳으로 옮기지 마세요.
4. 훈련 / 사용자설정 / 던전 중 원하는 모드를 고릅니다.

이 테스트 앱은 코드 서명이 없어 Windows 보안 경고가 나타날 수 있습니다. 제작자용 소스도 함께 제공하므로 출처를 확인하세요. 이 환경에서 Windows 실제 실행은 검증하지 못했습니다.

## Windows 설치판 + 자동 업데이트 활성화

제작자 PC에 Node.js 22 이상을 설치합니다. 플레이어 PC에는 필요하지 않습니다.

이 프로젝트는 GitHub 저장소 `jiwanww/game`의 고정 Release `latest`를 업데이트 주소로 사용하도록 이미 연결되어 있습니다. 빈 값이면 앱은 업데이트가 구성되지 않았다고 안내하고, 게임은 그대로 실행됩니다. `publisherName`은 정식 코드 서명 인증서의 발급 대상 이름과 맞춥니다. 서명은 electron-builder의 `CSC_LINK` / `CSC_KEY_PASSWORD` 환경 설정 등으로 연결하며 비밀 키나 비밀번호를 게임 소스에 저장하지 않습니다.

소스 압축을 푼 폴더에서 `BUILD-WINDOWS-APP.bat`을 실행하거나 다음 명령을 실행합니다.

```text
npm ci
npm run app:windows
```

Windows에서 성공적으로 빌드하면 `dist/windows`에 NSIS 설치 `.exe`, 업데이트 메타데이터와 blockmap이 생성됩니다. 이 저장소의 GitHub Actions `Windows Release`는 새 버전 태그를 받으면 이 파일들을 `latest` Release에 올립니다. 이 베타 채널은 `beta.yml`을 사용합니다. 설치 파일과 blockmap을 먼저 올리고 메타데이터는 마지막에 바꾸면 다운로드 중 불일치를 줄일 수 있습니다. 계정 토큰을 앱에 넣을 필요가 없는 공개 읽기 전용 GitHub Release 배포를 기준으로 구성했습니다.

앱은 시작 시와 6시간마다 확인하고 백그라운드에서 내려받습니다. 게임 중 강제로 종료하지 않으며 메인 화면에서 `재시작하여 적용`을 누르고 확인해야 설치합니다. 네트워크가 끊겨도 현재 설치 버전은 플레이할 수 있습니다. 처음부터 업데이트 주소가 들어 있는 **NSIS 설치판**을 배포해야 이 흐름이 작동합니다. 압축 실행용 테스트 앱은 이를 대신하지 않습니다.

다음 업데이트마다 `package.json`의 버전과 `apps/release-config.json`의 `buildNumber`를 올린 뒤 `v0.7.2-beta.1`처럼 같은 버전의 Git 태그를 올리면 됩니다. GitHub Actions가 자동 빌드하고 `latest` Release를 교체합니다. 현재 값은 `0.7.1-beta.1`, `70101`입니다. `appId`와 배포 채널은 이미 배포한 앱에서 임의로 바꾸지 마세요. 정식 채널 전환은 별도로 계획해야 합니다.

## Android · Google Play 자동 업데이트

Node.js 22+, Android Studio 2025.2.1 이상, JDK 21, Android SDK 36을 준비합니다. SDK 라이선스 확인은 제작자가 Android Studio에서 진행하세요.

```text
npm ci
npm run mobile:android
npm run mobile:android:open
```

또는 `BUILD-ANDROID-APP.bat`을 실행합니다. Android Studio에서 기기나 에뮬레이터로 확인한 다음 `Build → Generate Signed App Bundle / APK → Android App Bundle`을 사용합니다. 공개 등록 전 앱 식별자 `com.abilityfront.game`은 본인이 사용할 수 있는 고유 값인지 확인하세요. 이미 생성된 프로젝트와 다르면 스크립트가 중단하므로 최초 출시 전 신중히 정해야 합니다.

명령줄 테스트 APK는 `npm run mobile:android:debug`, 스토어용 AAB는 `npm run mobile:android:release`로 생성합니다. 릴리스 명령은 아래 환경 변수가 없으면 중단합니다. Android Studio에서 서명 번들을 생성하는 방법도 가능합니다.

| 환경 변수 | 내용 |
| --- | --- |
| AF_ANDROID_KEYSTORE | 본인 업로드 키 파일의 절대 경로 |
| AF_ANDROID_STORE_PASSWORD | 키 저장소 비밀번호 |
| AF_ANDROID_KEY_ALIAS | 키 별칭 |
| AF_ANDROID_KEY_PASSWORD | 키 비밀번호 |

업로드 키는 따로 안전하게 보관하세요. 같은 앱 식별자와 서명 체계를 유지하고, 업데이트마다 `buildNumber`를 증가시켜 Google Play Console에 새 AAB를 제출합니다. Play App Signing 및 테스트·심사·공개 절차를 거쳐야 합니다. 설치한 사용자의 Play 스토어 자동 업데이트 설정과 배포 상태에 따라 업데이트되며, 즉시 모든 기기에 적용되는 방식은 아닙니다. APK 파일을 직접 전달하는 것은 Google Play 자동 업데이트 배포와 다릅니다.

## iOS · App Store 자동 업데이트

Mac, Xcode 26 이상과 유효한 Apple 개발자 배포 설정이 필요합니다.

```text
npm ci
npm run mobile:ios
npm run mobile:ios:open
```

Xcode의 Signing & Capabilities에서 본인 Team과 Bundle Identifier를 확인한 뒤 실제 iPhone에서 가로 화면·멀티터치·WebGL·사운드를 테스트합니다. 이후 Product → Archive로 보관하고 App Store Connect로 업로드합니다. TestFlight 테스트와 앱 정보·심사를 거쳐 배포합니다. 업데이트는 같은 Bundle ID로 더 높은 빌드 번호의 새 버전을 제출합니다. 사용자 기기의 App Store 자동 업데이트 설정에 따라 설치됩니다. 앱 코드가 스토어 심사를 우회해 스스로 교체되는 방식은 구현하지 않았습니다.

## 멀티플레이와 저장

Windows 앱은 기존 Node 서버를 내부 실행합니다. 같은 네트워크 친구는 방 설정에 표시된 PC 주소로 접속할 수 있습니다. 서로 다른 집은 별도로 인터넷에서 접속 가능한 HTTPS 게임 서버가 필요합니다. **앱 업데이트 서버와 멀티플레이 서버는 별개입니다.** 앱으로 포장했다고 중앙 서버나 자동 매칭이 생기지는 않습니다.

모바일 앱은 멀티 서버를 직접 열지 않습니다. `친구 서버 주소 입력`에서 기존 인터넷 실행 서버의 HTTPS 주소를 입력하고 연결 확인 후 방을 만들거나 참가합니다. 훈련·싱글 던전은 서버 없이 실행합니다. HTTPS 서버가 중단되면 멀티는 이용할 수 없습니다.

해금 기록은 앱/브라우저의 로컬 저장소에 보관되며 아직 계정 기반 동기화가 없습니다. 설치판 업데이트는 같은 앱 ID와 데이터 경로를 유지하도록 구성했지만 브라우저의 기록이 앱으로 자동 이전되지는 않습니다. 앱 삭제나 데이터 초기화 시 기록이 사라질 수 있습니다.

## 검증 범위와 출시 전 확인

게임 규칙, 승리 전환, 효과음 스케줄, 모바일 서버 연결, 업데이트 상태 전환 자동 테스트 83개가 통과했습니다. Windows용 실행 폴더는 패키징했지만 NSIS 설치·실제 업데이트 교체, Android/iPhone 실제 기기 검증과 스토어 심사는 아직 완료하지 않았습니다. 모바일 기기별 프레임과 버튼 배치는 실기기 확인이 필요합니다. 기본 Capacitor/Electron 아이콘은 정식 등록 전에 게임용 최종 아이콘으로 교체하세요. 스토어 설명, 스크린샷, 개인정보 안내, 콘텐츠 등급, 게임 내 명칭·캐릭터·소재의 배포 권한도 출시 준비에 포함됩니다.

공식 참고: [Electron 보안 구성](https://www.electronjs.org/docs/latest/tutorial/security), [Capacitor 환경 준비](https://capacitorjs.com/docs/getting-started/environment-setup), [Google Play 배포](https://capacitorjs.com/docs/android/deploying-to-google-play), [App Store 배포](https://capacitorjs.com/docs/ios/deploying-to-app-store), [Apple 앱 자동 업데이트](https://support.apple.com/en-us/102629).
