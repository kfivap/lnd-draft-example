# issue-invoice-and-watch.js 
Alice выставляет invoice Bob, в консоль выводится хеш инвойса, ждем пока инвойс оплатится, после оплаты условно представляем что делаются доп действия по свапу, логаем баланс до и после, скрипт завершен 

# pay-invoice-init.js
Вставляем хеш инвойса cli аргументом, Bob подключается к alice, открывает канал с alice, оплачивает инвойс, закрывает канал, логаем баланс до и после, скрипт завершен

# pay-invoice.js
Не открывает и не закрывает канал!
Вставляем хеш инвойса cli аргументом, оплачивает инвойс, логаем баланс до и после, скрипт завершен