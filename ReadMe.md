# Willbot _β_

Willbot _β_ 是基于 [OICQ](https://github.com/takayama-lily/oicq) 协议库，使用 [MongoDB](https://www.mongodb.com/) 存储数据的 QQ 机器人.

Willbot _β_ 拥有简洁而自由的 **意志**.

上一版 Willbot 在 [main 分支](https://github.com/ForkKILLET/Willbot/tree/main)，已经停止维护，感谢TA的付出.

## 安装

```bash
$ git clone https://github.com/ForkKILLET/Willbot.git
$ cd Willbot
# 需要配置 Willbot
$ yarn
$ yarn start
```

## 配置

配置文件默认位于 `~/.config/WillbotBeta/config.yml`. 可以使用 `--rc-path | -c` 选项指定 **资源目录** 路径，配置文件必须在资源目录下并且名称为 `config.yml`.

必须的配置项是：

```yml
account:
  uin: number		# 机器人的 QQ 号
  pw: string		# 机器人的 QQ 密码

database:
  addr: string		# MongoDB 地址
  port: number		# MongoDB 端口

commands:
  prompts: string[]	# 提示符（唤起机器人的前缀）
```

Willbot _β_ 会列出有误的配置项.

## 扩展

向 `src/commands/` 目录中添加/删除 `.will.js` 结尾的文件，即可自定义命令. 暂时没有文档.

## 使用

假定提示符为 `w>`.

以 `提示符 命令 参数` 的形式调用 Willbot _β_. 当你不知道某个命令在哪时可以使用 `where`.

```plain
w> where echo
echo: 1 result(s)
test.echo
```

使用 `.` 号（英文句号）分割的命令名称调用多级命令.

```plain
w> test.echo Hello, will!
Hello, will!
```

命令中可以使用 `'`、`"`（单双引号），`\`（反斜杠）转义和 `\u??`、`\0??`、`\x??`（十六进制转义、八进制转义、二位十六进制转义）.

```plain
w> test.echo "Willbot   真\u9999"
Willbot   真香

w> test.echo 空\ 格\n换行
空 格
换行
```

如果一个命令显示 `not executable`，说明这个命令不能直接执行，但可能有子命令.

```plain
w> test
test: not executable
```

在 **任意** 命令后加 `.?` 或 `.help` 即可使用帮助命令.

```plain
w> ?
(root): subs: dice, github, pyrga, test, where, ?, chess, help
no usage
help: Willbot v0.2.0 β

w> test.?
test: subs: echo, ?, say, help
no usage
help: no information

w> test.echo.?
echo: alias: say
subs: ?, help
usage: echo <sentence: text>
help: send <sentence> in the current context
```

## 使用截图

截图使用 QQ 客户端为 [Icalingua++](github.com/Icalingua-plus-plus/Icalingua-plus-plus/)，感谢 Icalingua++ 社区提供优质软件！

### [Pyrga 抽象棋](https://www.bilibili.com/video/BV1fa411e7ih)

![ss-1](https://s2.loli.net/2022/05/12/xnypuqlI4Z9AJC1.png)

### 今日人品

![ss-2](https://s2.loli.net/2022/05/12/6xh43wKIvin2bRY.png)

## 许可证

[GPL](./LICENSE)
