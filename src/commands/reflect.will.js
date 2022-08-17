export default () => ({
    perm: 4,
    alias: [ '反思' ],
    help: '让 WillBot 反思其发送的消息是否合适',
    args: [ { ty: '$quote' } ],
    async fn(quote) {
        await bot.oicq.deleteMsg(quote.message_id)
    }
})