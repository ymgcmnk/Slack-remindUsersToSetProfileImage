/**
 * SlackのAPIトークン。
 * @type {string}
 * @const
 * @description SlackのAPIにアクセスするために必要なトークン。このトークンは秘密情報なので、外部に漏れないように注意する必要があります。
 */
const SLACK_TOKEN = PropertiesService.getScriptProperties().getProperty('BotUserOAuthToken');

/**
 * Slackの全てのユーザー情報を取得する関数。
 * @return {Array} ユーザー情報の配列。
 */
function getAllUsers() {
  const url = `https://slack.com/api/users.list`;
  let allUsers = [];
  let cursor = null;

  do {
    const options = {
      method: "get",
      contentType: "application/x-www-form-urlencoded",
      headers: { "Authorization": `Bearer ${SLACK_TOKEN}` },
      payload: {
        "limit": 1000,
        "cursor": cursor
      }
    };

    const usersResponse = UrlFetchApp.fetch(url, options);
    const parsedResponse = JSON.parse(usersResponse.getContentText());
    allUsers = allUsers.concat(parsedResponse.members || []);
    cursor = parsedResponse.response_metadata ? parsedResponse.response_metadata.next_cursor : null;
  } while (cursor);

  return allUsers;
}


/**
 * 与えられたURLがSlackのデフォルトのプロフィール画像のURLかどうかを判断する関数。
 * @param {string} url - プロフィール画像のURL。
 * @return {boolean} デフォルトのプロフィール画像の場合はtrue、それ以外の場合はfalse。
 */
function isDefaultProfileImage(url) {
  // return url.includes('gravatar.com') || url.includes('slack-edge.com');
  return url.includes('gravatar.com') 
}

/**
 * Slackの指定されたチャンネルにメッセージを投稿する関数。
 * @param {string} message - 投稿するメッセージ。
 */
function postMessageToSlack(message) {
  const POST_CHANNEL_ID = PropertiesService.getScriptProperties().getProperty('POST_CHANNEL_ID');
  const url = `https://slack.com/api/chat.postMessage`;
  const options = {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    headers: { "Authorization": `Bearer ${SLACK_TOKEN}` },
    payload: {
      "channel": POST_CHANNEL_ID,
      "text": message
    }
  };

  UrlFetchApp.fetch(url, options);
}

/**
 * プロフィール画像を設定していないユーザーに対して、プロフィール画像を設定するようにリマインドする関数。
 */
function remindUsersToSetProfileImage() {
  const members = getAllUsers();

  const usersWithDefaultProfileImage = members.filter(member => 
    isDefaultProfileImage(member.profile.image_192) && 
    !member.is_restricted && 
    !member.is_ultra_restricted &&
    !member.deleted &&
    !member.is_bot
  );

  const mentions = usersWithDefaultProfileImage.map(user => `<@${user.id}>`).join(' ');
  const message = `${mentions} プロフィール画像を設定してください！`;

  postMessageToSlack(message);
}

/**
 * 毎月1日の9時にプロフィール画像のリマインドをSlackに投稿するトリガーを設定する関数。
 */
function setMonthlyTrigger() {
  ScriptApp.newTrigger('remindUsersToSetProfileImage')
    .timeBased()
    .onMonthDay(1)
    .atHour(9)
    .create();
}
