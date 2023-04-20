document.querySelector('.video__resume').onclick = () => {
  document.querySelectorAll('.hide').forEach(item => {
    item.style.display = 'none';
  })

  document.querySelectorAll('.show').forEach(item => {
    item.style.display = 'block';
  })

  document.querySelector('.video__info').style.marginTop = '0';
  document.querySelector('.video__btn').style.width = 'auto';
  document.querySelector('.video__btn').style.padding = '6px 15px 6px 5px';
}
