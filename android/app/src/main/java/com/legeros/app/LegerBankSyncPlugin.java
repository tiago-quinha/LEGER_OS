package com.legeros.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@CapacitorPlugin(name = "LegerBankSync")
public class LegerBankSyncPlugin extends Plugin {

    private static final String PREFS_NAME = "leger_bank_sync_prefs";
    private static final String KEY_PACKAGES = "selected_bank_packages";

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        try {
            Context context = getContext();
            PackageManager pm = context.getPackageManager();
            List<ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);

            JSArray appsArray = new JSArray();

            for (ApplicationInfo appInfo : apps) {
                // Filter for apps that have launchable intent (user-installed apps or main apps)
                if (pm.getLaunchIntentForPackage(appInfo.packageName) != null) {
                    String appName = pm.getApplicationLabel(appInfo).toString();
                    String pkg = appInfo.packageName;

                    boolean isFinance = isLikelyFinanceApp(appName, pkg, appInfo);

                    JSObject appObj = new JSObject();
                    appObj.put("name", appName);
                    appObj.put("packageName", pkg);
                    appObj.put("isFinance", isFinance);
                    appsArray.put(appObj);
                }
            }

            JSObject ret = new JSObject();
            ret.put("apps", appsArray);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to list installed apps: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getSelectedBankPackages(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            Set<String> saved = prefs.getStringSet(KEY_PACKAGES, new HashSet<>());

            JSArray arr = new JSArray();
            for (String pkg : saved) {
                arr.put(pkg);
            }

            JSObject ret = new JSObject();
            ret.put("packages", arr);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to read selected packages: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setSelectedBankPackages(PluginCall call) {
        try {
            JSArray packagesArr = call.getArray("packages");
            if (packagesArr == null) {
                call.reject("packages array is required");
                return;
            }

            Set<String> packageSet = new HashSet<>();
            for (int i = 0; i < packagesArr.length(); i++) {
                packageSet.add(packagesArr.getString(i));
            }

            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putStringSet(KEY_PACKAGES, packageSet);

            String userId = call.getString("userId", null);
            if (userId != null && !userId.isEmpty()) {
                editor.putString("user_id", userId);
            }

            String baseUrl = call.getString("baseUrl", null);
            if (baseUrl != null && !baseUrl.isEmpty()) {
                editor.putString("base_url", baseUrl);
            }

            editor.apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("count", packageSet.size());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to save selected packages: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setSyncContext(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            String userId = call.getString("userId", null);
            if (userId != null && !userId.isEmpty()) {
                editor.putString("user_id", userId);
            }

            String baseUrl = call.getString("baseUrl", null);
            if (baseUrl != null && !baseUrl.isEmpty()) {
                editor.putString("base_url", baseUrl);
            }

            editor.apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to set sync context: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isNotificationAccessGranted(PluginCall call) {
        try {
            Context context = getContext();
            Set<String> enabledPackages = NotificationManagerCompat.getEnabledListenerPackages(context);
            boolean isGranted = enabledPackages.contains(context.getPackageName());

            JSObject ret = new JSObject();
            ret.put("granted", isGranted);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to check notification access: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openNotificationAccessSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to open notification settings: " + e.getMessage());
        }
    }

    private boolean isLikelyFinanceApp(String name, String pkg, ApplicationInfo appInfo) {
        // Comprehensive 100+ Bank, Fintech, Neobank, Payment and Crypto App Matching
        String n = name.toLowerCase();
        String p = pkg.toLowerCase();

        return n.contains("bank") || n.contains("banco") || n.contains("mb way") || n.contains("mbway") ||
                n.contains("santander") || n.contains("revolut") || n.contains("caixa") || n.contains("cgd") ||
                n.contains("millennium") || n.contains("bcp") || n.contains("activo") || n.contains("novobanco") ||
                n.contains("novo banco") || n.contains("banco ctt") || n.contains("bpi") || n.contains("bankinter") ||
                n.contains("montepio") || n.contains("moey") || n.contains("eurobic") || n.contains("abanca") ||
                n.contains("universo") || n.contains("wizink") || n.contains("cofidis") || n.contains("bbva") ||
                n.contains("caixabank") || n.contains("sabadell") || n.contains("openbank") || n.contains("imagin") ||
                n.contains("bizum") || n.contains("monzo") || n.contains("starling") || n.contains("barclays") ||
                n.contains("hsbc") || n.contains("lloyds") || n.contains("natwest") || n.contains("halifax") ||
                n.contains("nationwide") || n.contains("chase") || n.contains("n26") || n.contains("wise") ||
                n.contains("trade republic") || n.contains("scalable") || n.contains("bunq") || n.contains("klarna") ||
                n.contains("curve") || n.contains("plum") || n.contains("vivid") || n.contains("trading 212") ||
                n.contains("xtb") || n.contains("degiro") || n.contains("etoro") || n.contains("bitpanda") ||
                n.contains("boursobank") || n.contains("lydia") || n.contains("bnp paribas") || n.contains("société générale") ||
                n.contains("crédit agricole") || n.contains("sparkasse") || n.contains("deutsche bank") || n.contains("commerzbank") ||
                n.contains("dkb") || n.contains("ing") || n.contains("intesa") || n.contains("unicredit") ||
                n.contains("postepay") || n.contains("fineco") || n.contains("satispay") || n.contains("bank of america") ||
                n.contains("wells fargo") || n.contains("citi") || n.contains("capital one") || n.contains("amex") ||
                n.contains("discover") || n.contains("us bank") || n.contains("pnc") || n.contains("sofi") ||
                n.contains("venmo") || n.contains("cash app") || n.contains("zelle") || n.contains("robinhood") ||
                n.contains("coinbase") || n.contains("fidelity") || n.contains("schwab") || n.contains("vanguard") ||
                n.contains("paypal") || n.contains("wallet") || n.contains("pay") || n.contains("nubank") ||
                n.contains("itaú") || n.contains("bradesco") || n.contains("inter") || n.contains("c6 bank") ||
                n.contains("mercado pago") || n.contains("picpay") || n.contains("pagbank") || n.contains("binance") ||
                n.contains("kraken") || n.contains("bybit") || n.contains("crypto") || n.contains("finance") ||
                p.contains("bank") || p.contains("banco") || p.contains("sibs") || p.contains("santander") ||
                p.contains("revolut") || p.contains("cgd") || p.contains("bcp") || p.contains("activo") ||
                p.contains("novobanco") || p.contains("bpi") || p.contains("bankinter") || p.contains("montepio") ||
                p.contains("abanca") || p.contains("bbva") || p.contains("caixabank") || p.contains("bizum") ||
                p.contains("monzo") || p.contains("starling") || p.contains("barclays") || p.contains("hsbc") ||
                p.contains("lloyds") || p.contains("rbs") || p.contains("chase") || p.contains("number26") ||
                p.contains("transferwise") || p.contains("traderepublic") || p.contains("klarna") || p.contains("curve") ||
                p.contains("trading212") || p.contains("xtb") || p.contains("degiro") || p.contains("etoro") ||
                p.contains("paypal") || p.contains("wallet") || p.contains("bofa") || p.contains("nu.production") ||
                p.contains("itau") || p.contains("bradesco") || p.contains("binance") || p.contains("kraken") ||
                p.contains("finance");
    }
}
