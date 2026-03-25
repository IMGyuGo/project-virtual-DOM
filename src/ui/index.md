# index.html 사용법

`index.html`은 **Nexus Home Virtual DOM 데모**를 실행하는 진입 페이지입니다.

## 1) 실행 방법

프로젝트 루트(`/Users/j/Desktop/Jungle/project-virtual-DOM`)에서 정적 서버를 실행합니다.

```bash
python3 -m http.server 8002
```

브라우저에서 아래 주소로 접속합니다.

`http://localhost:8002`

## 2) 화면 구성

- **현재 Nexus Home 상태 (수정 불가능)**
  - Patch가 적용된 실제 DOM 상태를 보여줍니다.
- **Nexus Home 상태 수정 뷰**
  - 장치 제어 버튼/입력으로 상태를 변경하는 테스트 영역입니다.
- **Real-time Patch Log**
  - 최신 Patch 목록을 실시간으로 표시합니다.
- **Diff 결과 (달라진 내용)**
  - 현재 변경에서 계산된 patch 객체(JSON tree)를 보여줍니다.
- **Patch 전 Virtual DOM / Patch 될 Virtual DOM**
  - 변경 전/후 트리를 비교합니다.
- **Tree Visualizer**
  - VDOM 구조와 변경 path 하이라이트를 시각화합니다.

## 3) 상단 버튼 기능

- `Patch`
  - 수정 뷰의 상태를 기준으로 Diff/Patch를 계산해 실제 상태에 반영합니다.
- `뒤로가기`
  - 마지막 Patch 적용 상태를 한 단계 되돌립니다.
- `앞으로가기`
  - `뒤로가기`로 되돌린 상태를 다시 진행합니다.
- `외출모드 ON OFF`
  - 테스트 뷰의 조명/에어컨 상태를 외출 모드 기준으로 토글합니다.
- `시간+1시간`
  - 테스트 뷰의 헤더 시간/날씨/에너지 값을 1시간 진행합니다.
- `초기화`
  - 테스트 뷰를 초기 Nexus Home 상태로 재생성하고 동기화합니다.

## 4) 상태 수정 방법 (수정 뷰)

수정 가능한 항목:

- 조명: `ON` / `OFF` 버튼
- 에어컨 전원: `RUNNING` / `STOPPED` 버튼
- 에어컨 온도: 숫자 입력 (`16`~`30`)
- 보안카메라: `녹화중` / `대기중` 버튼

수정 불가능 항목:

- 방 이름(거실/침실/주방), 장치 라벨(조명/에어컨/보안카메라) 등의 텍스트

참고:

- 수정 뷰는 `contenteditable`이 아니므로 Enter로 빈 노드가 추가되지 않습니다.

## 5) 기본 사용 흐름

1. 수정 뷰에서 장치 상태를 바꿉니다.
2. `Patch` 버튼을 누릅니다.
3. 아래 4개를 함께 확인합니다.
   - Real-time Patch Log
   - Diff 결과
   - Patch 전 Virtual DOM
   - Patch 될 Virtual DOM
4. 필요하면 `뒤로가기` / `앞으로가기`로 상태 이력을 확인합니다.
