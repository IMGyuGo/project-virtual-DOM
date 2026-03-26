# 브라우저에서 DOM을 다루는 방법

브라우저에서 화면을 다룰 때 가장 자주 만나는 객체는 `Document`와 `Window`이다.  
둘 다 브라우저가 제공하는 객체이지만 역할은 다르다.

- `Window`: 브라우저 창 전체를 나타내는 최상위 객체
- `Document`: 현재 페이지의 HTML 문서를 나타내는 객체

쉽게 말하면 `Window`는 "브라우저 환경 전체", `Document`는 "그 안에 로드된 웹 페이지"라고 보면 된다.

## 1. Window란?

`window`는 브라우저 탭 또는 창 자체를 나타내는 객체이다.  
전역 객체이기 때문에 브라우저에서 선언한 전역 변수나 함수는 보통 `window`에 연결된다.

예시:

```js
console.log(window);
console.log(window.innerWidth);
console.log(window.innerHeight);
```

자주 쓰는 기능:

- 창 크기 확인: `window.innerWidth`, `window.innerHeight`
- 알림창: `window.alert()`
- 시간 관련 함수: `window.setTimeout()`, `window.setInterval()`
- 스크롤 관련: `window.scrollTo()`
- 현재 주소 정보: `window.location`

예시:

```js
window.alert('안녕하세요');

console.log(window.location.href);

window.setTimeout(() => {
  console.log('3초 뒤 실행');
}, 3000);
```

## 2. Document란?

`document`는 현재 브라우저에 표시된 HTML 문서를 의미한다.  
즉, 우리가 작성한 태그들을 찾고, 수정하고, 새로 만들 때 주로 사용하는 객체이다.

예를 들어 아래 HTML이 있다고 하자.

```html
<body>
  <h1 id="title">Hello</h1>
  <button id="btn">Click</button>
</body>
```

이때 JavaScript에서 `document`를 이용해 요소를 찾을 수 있다.

```js
const title = document.getElementById('title');
const button = document.querySelector('#btn');

console.log(title.textContent);
```

자주 쓰는 기능:

- 요소 찾기: `getElementById()`, `querySelector()`, `querySelectorAll()`
- 요소 생성: `createElement()`
- 내용 변경: `textContent`, `innerHTML`
- 속성 변경: `setAttribute()`, `getAttribute()`
- 클래스 변경: `classList.add()`, `classList.remove()`, `classList.toggle()`
- 이벤트 연결: `addEventListener()`

## 3. Document로 DOM 조작하기

### 1) 요소 찾기

```js
const title = document.getElementById('title');
const card = document.querySelector('.card');
const items = document.querySelectorAll('.item');
```

- `getElementById('id')`: id로 하나 찾기
- `querySelector('선택자')`: CSS 선택자로 첫 번째 요소 찾기
- `querySelectorAll('선택자')`: 여러 요소 찾기

### 2) 텍스트 바꾸기

```js
const title = document.querySelector('#title');
title.textContent = 'DOM 공부하기';
```

### 3) 스타일 또는 클래스 바꾸기

```js
const box = document.querySelector('.box');

box.style.color = 'red';
box.classList.add('active');
box.classList.toggle('highlight');
```

### 4) 새로운 요소 만들기

```js
const li = document.createElement('li');
li.textContent = '새 항목';

document.querySelector('ul').appendChild(li);
```

### 5) 요소 삭제하기

```js
const target = document.querySelector('.item');
target.remove();
```

## 4. 이벤트와 함께 사용하기

DOM 조작은 보통 이벤트와 함께 사용된다.

```js
const button = document.querySelector('#btn');
const title = document.querySelector('#title');

button.addEventListener('click', () => {
  title.textContent = '버튼을 눌렀습니다';
});
```

위 코드는 버튼을 클릭했을 때 제목 텍스트를 바꾸는 가장 기본적인 DOM 조작 예시이다.

## 5. Window와 Document의 관계

`document`는 `window` 안에 들어 있는 객체이다.

```js
console.log(window.document);
console.log(document === window.document);
```

즉:

- `window`는 브라우저 전체 환경
- `document`는 현재 HTML 페이지

그래서 보통 화면 요소를 찾고 바꿀 때는 `document`를 쓰고,  
브라우저 창 크기나 주소, 스크롤, 타이머를 다룰 때는 `window`를 쓴다.

## 6. Virtual DOM 프로젝트와 연결해서 보기

지금 프로젝트에서도 결국 출발점은 실제 DOM이다.

- `document.querySelector()`로 루트 요소를 찾을 수 있다.
- `document.createElement()`로 새 DOM 노드를 만들 수 있다.
- `element.setAttribute()`로 속성을 바꿀 수 있다.
- `element.appendChild()` 또는 `replaceChildren()`로 화면을 갱신할 수 있다.

예를 들면 현재 프로젝트의 흐름은 아래처럼 이해할 수 있다.

1. `document`를 통해 실제 DOM을 읽는다.
2. 그 DOM을 Virtual DOM 형태로 변환한다.
3. 이전 상태와 다음 상태를 비교한다.
4. 필요한 부분만 다시 실제 DOM에 반영한다.

즉, Virtual DOM도 결국은 브라우저의 `Document`와 실제 DOM 조작 위에서 동작하는 구조이다.

## 7. 한 줄 정리

- `Window`: 브라우저 전체를 다루는 객체
- `Document`: 현재 HTML 문서를 다루는 객체
- DOM 조작의 핵심은 `document`로 요소를 찾고, 수정하고, 추가하고, 삭제하는 것이다.
