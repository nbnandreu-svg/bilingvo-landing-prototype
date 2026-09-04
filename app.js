const dialog = document.querySelector('#preview-dialog');
const message = document.querySelector('#preview-message');
function showPreview(text) {
  message.textContent = text;
  dialog.showModal();
}
document.querySelectorAll('[data-preview]').forEach(button => {
  button.addEventListener('click', () => showPreview(button.dataset.preview));
});
document.querySelectorAll('form[data-kind]').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    showPreview(form.dataset.kind === 'room'
      ? 'Это демонстрационный прототип сайта. Подключение к реальной комнате здесь пока не настроено.'
      : 'Это демонстрационная форма. Заявка не отправлена, введенные данные никуда не передаются. Для связи: sales@agropromcifra.ru или +7 (495) 260-14-16.');
  });
});
dialog.addEventListener('click', event => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }
});
