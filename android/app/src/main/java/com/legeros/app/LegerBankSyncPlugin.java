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
            prefs.edit().putStringSet(KEY_PACKAGES, packageSet).apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("count", packageSet.size());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to save selected packages: " + e.getMessage());
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
        String lowerName = name.toLowerCase();
        String lowerPkg = pkg.toLowerCase();

        return lowerName.contains("bank") || lowerName.contains("banco") || lowerName.contains("mb way") ||
                lowerName.contains("mbway") || lowerName.contains("santander") || lowerName.contains("revolut") ||
                lowerName.contains("caixa") || lowerName.contains("cgd") || lowerName.contains("millennium") ||
                lowerName.contains("bcp") || lowerName.contains("activo") || lowerName.contains("pay") ||
                lowerName.contains("wallet") || lowerName.contains("wise") || lowerName.contains("n26") ||
                lowerName.contains("trade republic") || lowerName.contains("crypto") || lowerName.contains("finance") ||
                lowerPkg.contains("bank") || lowerPkg.contains("banco") || lowerPkg.contains("sibs") ||
                lowerPkg.contains("revolut") || lowerPkg.contains("finance") || lowerPkg.contains("wallet");
    }
}
