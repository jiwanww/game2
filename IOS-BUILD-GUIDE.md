# 능력전선 iOS 베타 빌드

이 압축 파일을 macOS에서 풀고 `ios/App/App.xcworkspace`를 Xcode로 연다.

1. Xcode의 **Signing & Capabilities**에서 본인의 Apple 개발자 팀을 선택한다.
2. iPhone을 연결해 실행하거나, 상단의 실행 기기에서 Simulator를 선택한다.
3. App Store Connect 배포는 **Product > Archive** 후 **Distribute App > App Store Connect > TestFlight** 순서로 진행한다.

앱 식별자는 `com.abilityfront.game`이고, 현재 버전은 `0.7.1-beta.1`이다. 게임은 가로 화면과 터치 조작에 맞춰 설정되어 있다.

Apple 서명과 App Store Connect 업로드는 Apple 개발자 계정 및 macOS의 Xcode 환경에서 완료해야 한다.
