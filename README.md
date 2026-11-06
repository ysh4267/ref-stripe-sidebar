# Sidebar Toggle

Stripe 대시보드의 사이드바 접기 손잡이를 레퍼런스 영상과 같은 모양, 같은 움직임으로 다시 그린 페이지.

레퍼런스: [Design Spells — Animation when hovering on the sidebar toggle in Stripe](https://designspells.com/spells/animation-when-hovering-on-the-sidebar-toggle-in-stripe)

## 담긴 인터랙션

손잡이에 올리면 사이드바 경계선이 살짝 줄어든다(펼친 상태). 접힌 상태에서는 살짝 늘어난다. 이때 손잡이 막대가 꺾쇠로 꺾였다가, 포인터가 떠나면 다시 펴진다.

누르면 사이드바가 한 프레임 만에 접히고 펼쳐진다. 이름표는 바로 뜨고 사라질 때만 0.3초 흐려진다. 화면에는 사이드바와 관련된 것만 두고 오른쪽 본문은 뺐다.

## 만든 방법

- 영상(1920x1080)을 프레임 단위로 재서 위치, 크기, 색, 시간을 그대로 옮겼다. 좌표는 영상 픽셀이고, `svg` 의 `viewBox` 가 창을 덮도록 왼쪽 위 기준으로 맞춘다.
- 영상의 글꼴(맥 시스템 글꼴) 대신 Inter 를 쓰고, 글자마다 대문자 높이와 잉크 폭을 영상과 같게 맞춘다(`fitText`).
- 아이콘은 비슷한 선 아이콘으로 새로 그렸다. 로고나 상표는 쓰지 않는다.
- 빌드 없이 `index.html`, `style.css`, `main.js` 만으로 돌아간다.

## 주소 옵션

- `?demo` : 포인터 없이 올리기와 누르기를 되풀이한다(갤러리 미리보기용).
