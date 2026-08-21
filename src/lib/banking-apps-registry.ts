export interface BankingAppPreset {
  id: string
  name: string
  package: string
  region: string
  domain: string
}

export const BANKING_APPS_REGISTRY: BankingAppPreset[] = [
  // --- PORTUGAL ---
  { id: "santander_pt", name: "Santander Portugal", package: "com.santander.app", region: "Portugal", domain: "santander.pt" },
  { id: "santander_oneapp", name: "Santander OneApp", package: "pt.santander.oneappparticulares", region: "Portugal", domain: "santander.pt" },
  { id: "santander_totta", name: "Santander Totta", package: "pt.santandertotta.mobileparticulares", region: "Portugal", domain: "santander.pt" },
  { id: "mbway", name: "MB WAY", package: "com.sibs.mbway", region: "Portugal", domain: "mbway.pt" },
  { id: "cgd", name: "Caixa Geral de Depósitos", package: "pt.cgd.caixadirecta", region: "Portugal", domain: "cgd.pt" },
  { id: "millennium_bcp", name: "Millennium bcp", package: "pt.bcp.app", region: "Portugal", domain: "millenniumbcp.pt" },
  { id: "activobank", name: "ActivoBank", package: "pt.activobank.mobile", region: "Portugal", domain: "activobank.pt" },
  { id: "novobanco", name: "Novo Banco", package: "pt.novobanco.app", region: "Portugal", domain: "novobanco.pt" },
  { id: "banco_ctt", name: "Banco CTT", package: "pt.bancoctt.app", region: "Portugal", domain: "bancoctt.pt" },
  { id: "bpi", name: "Banco BPI", package: "pt.bpi.bpidireto", region: "Portugal", domain: "bancobpi.pt" },
  { id: "bankinter_pt", name: "Bankinter Portugal", package: "com.bankinter.pt", region: "Portugal", domain: "bankinter.pt" },
  { id: "montepio", name: "Banco Montepio", package: "pt.montepio.mobile", region: "Portugal", domain: "bancomontepio.pt" },
  { id: "moey", name: "moey!", package: "pt.creditoagricola.moey", region: "Portugal", domain: "moey.pt" },
  { id: "credito_agricola", name: "Crédito Agrícola", package: "pt.ca.directa", region: "Portugal", domain: "creditoagricola.pt" },
  { id: "eurobic", name: "EuroBic", package: "pt.eurobic.mobile", region: "Portugal", domain: "eurobic.pt" },
  { id: "abanca_pt", name: "ABANCA Portugal", package: "com.abanca.mobile.pt", region: "Portugal", domain: "abanca.pt" },
  { id: "universo", name: "Cartão Universo", package: "pt.sonae.universo", region: "Portugal", domain: "universo.pt" },
  { id: "wizink_pt", name: "WiZink Portugal", package: "pt.wizink.app", region: "Portugal", domain: "wizink.pt" },
  { id: "cofidis_pt", name: "Cofidis Portugal", package: "pt.cofidis.mobile", region: "Portugal", domain: "cofidis.pt" },
  { id: "banco_invest", name: "Banco Invest", package: "pt.bancoinvest.mobile", region: "Portugal", domain: "bancoinvest.pt" },
  { id: "banco_best", name: "Banco Best", package: "pt.bancobest.mobile", region: "Portugal", domain: "bancobest.pt" },

  // --- SPAIN ---
  { id: "santander_es", name: "Santander España", package: "com.santander.app.es", region: "Spain", domain: "bancosantander.es" },
  { id: "bbva_es", name: "BBVA España", package: "com.bbva.bbvacontigo", region: "Spain", domain: "bbva.es" },
  { id: "caixabank_es", name: "CaixaBankNow", package: "es.caixabank.caixabanknow", region: "Spain", domain: "caixabank.es" },
  { id: "sabadell", name: "Banco Sabadell", package: "com.bancsabadell.bsmobile", region: "Spain", domain: "bancsabadell.com" },
  { id: "bankinter_es", name: "Bankinter España", package: "com.bankinter.launcher", region: "Spain", domain: "bankinter.com" },
  { id: "ing_es", name: "ING España", package: "com.ing.mobile.es", region: "Spain", domain: "ing.es" },
  { id: "openbank", name: "Openbank", package: "es.openbank.mobile", region: "Spain", domain: "openbank.es" },
  { id: "imagin", name: "imagin", package: "es.imaginbank.app", region: "Spain", domain: "imagin.com" },
  { id: "ibercaja", name: "Ibercaja", package: "es.ibercaja.ibercajadirecto", region: "Spain", domain: "ibercaja.es" },
  { id: "unicaja", name: "Unicaja Banco", package: "es.unicaja.banca.movil", region: "Spain", domain: "unicajabanco.es" },
  { id: "kutxabank", name: "Kutxabank", package: "com.kutxabank.android", region: "Spain", domain: "kutxabank.es" },
  { id: "abanca_es", name: "ABANCA España", package: "com.abanca.mobile", region: "Spain", domain: "abanca.com" },
  { id: "bizum", name: "Bizum", package: "es.bizum.app", region: "Spain", domain: "bizum.es" },

  // --- UK ---
  { id: "revolut_uk", name: "Revolut", package: "com.revolut.revolut", region: "UK / Global", domain: "revolut.com" },
  { id: "monzo", name: "Monzo Bank", package: "co.uk.monzo", region: "UK", domain: "monzo.com" },
  { id: "starling", name: "Starling Bank", package: "com.starlingbank.android", region: "UK", domain: "starlingbank.com" },
  { id: "barclays_uk", name: "Barclays", package: "com.barclays.android.barclaysmobilebanking", region: "UK", domain: "barclays.co.uk" },
  { id: "hsbc_uk", name: "HSBC UK", package: "uk.co.hsbc.hsbcukmobilebanking", region: "UK", domain: "hsbc.co.uk" },
  { id: "lloyds", name: "Lloyds Bank", package: "com.grppgb.dockside", region: "UK", domain: "lloydsbank.com" },
  { id: "natwest", name: "NatWest", package: "com.rbs.mobile.android.natwest", region: "UK", domain: "natwest.com" },
  { id: "halifax", name: "Halifax", package: "com.grppgb.halifaxdockside", region: "UK", domain: "halifax.co.uk" },
  { id: "santander_uk", name: "Santander UK", package: "uk.co.santander.santanderUK", region: "UK", domain: "santander.co.uk" },
  { id: "nationwide", name: "Nationwide", package: "uk.co.nationwide.mobile", region: "UK", domain: "nationwide.co.uk" },
  { id: "chase_uk", name: "Chase UK", package: "com.chase.international.uk", region: "UK", domain: "chase.co.uk" },

  // --- PAN-EUROPEAN & DIGITAL NEOBANKS ---
  { id: "n26", name: "N26", package: "de.number26.android", region: "EU / Global", domain: "n26.com" },
  { id: "wise", name: "Wise", package: "com.transferwise.android", region: "Global", domain: "wise.com" },
  { id: "trade_republic", name: "Trade Republic", package: "com.traderepublic.app", region: "EU", domain: "traderepublic.com" },
  { id: "scalable_capital", name: "Scalable Capital", package: "com.scalable.capital", region: "EU", domain: "scalable.capital" },
  { id: "bunq", name: "bunq", package: "com.bunq.android", region: "EU", domain: "bunq.com" },
  { id: "klarna", name: "Klarna", package: "com.myklarnamobile", region: "Global", domain: "klarna.com" },
  { id: "curve", name: "Curve", package: "com.imaginecurve.curve.prd", region: "UK / EU", domain: "curve.com" },
  { id: "plum", name: "Plum", package: "com.plum.money", region: "EU / UK", domain: "withplum.com" },
  { id: "vivid_money", name: "Vivid Money", package: "money.vivid.app", region: "EU", domain: "vivid.money" },
  { id: "trading212", name: "Trading 212", package: "com.avuscapital.trading212", region: "Global", domain: "trading212.com" },
  { id: "xtb", name: "XTB", package: "com.xtb.mobile", region: "EU", domain: "xtb.com" },
  { id: "degiro", name: "DEGIRO", package: "nl.degiro.trader", region: "EU", domain: "degiro.com" },
  { id: "etoro", name: "eToro", package: "com.etoro.openbook", region: "Global", domain: "etoro.com" },
  { id: "bitpanda", name: "Bitpanda", package: "com.bitpanda.bitpanda", region: "EU", domain: "bitpanda.com" },

  // --- FRANCE & GERMANY ---
  { id: "boursobank", name: "BoursoBank", package: "com.boursorama.android.clients", region: "France", domain: "boursobank.com" },
  { id: "lydia", name: "Lydia / Sumeria", package: "com.lydia", region: "France", domain: "sumeria.eu" },
  { id: "bnp_paribas", name: "BNP Paribas", package: "com.bnpparibas.mescomptes", region: "France", domain: "mabanque.bnpparibas" },
  { id: "societe_generale", name: "Société Générale", package: "com.socgen.sgclt", region: "France", domain: "societegenerale.fr" },
  { id: "credit_agricole_fr", name: "Crédit Agricole (Ma Banque)", package: "fr.creditagricole.mabanque", region: "France", domain: "credit-agricole.fr" },
  { id: "sparkasse", name: "Sparkasse", package: "com.starfinanz.smob.android.sfinanzstatus", region: "Germany", domain: "sparkasse.de" },
  { id: "deutsche_bank", name: "Deutsche Bank", package: "com.db.mm.app", region: "Germany", domain: "deutsche-bank.de" },
  { id: "commerzbank", name: "Commerzbank", package: "de.commerzbank.mobile.android", region: "Germany", domain: "commerzbank.de" },
  { id: "dkb", name: "DKB", package: "de.dkb.banking.bankingapp", region: "Germany", domain: "dkb.de" },
  { id: "ing_de", name: "ING Deutschland", package: "com.ing.direct.app", region: "Germany", domain: "ing.de" },

  // --- ITALY ---
  { id: "intesa_sanpaolo", name: "Intesa Sanpaolo", package: "com.intesasanpaolo.android.smartphone", region: "Italy", domain: "intesasanpaolo.com" },
  { id: "unicredit_it", name: "UniCredit Italia", package: "it.unicredit.android", region: "Italy", domain: "unicredit.it" },
  { id: "postepay", name: "Postepay", package: "posteitaliane.postepay", region: "Italy", domain: "postepay.poste.it" },
  { id: "fineco", name: "FinecoBank", package: "it.fineco.android", region: "Italy", domain: "finecobank.com" },
  { id: "illimity", name: "illimity bank", package: "com.illimity.bank", region: "Italy", domain: "illimity.com" },
  { id: "satispay", name: "Satispay", package: "com.satispay.customer", region: "Italy", domain: "satispay.com" },

  // --- UNITED STATES & NORTH AMERICA ---
  { id: "chase_us", name: "Chase Mobile", package: "com.chase.sig.android", region: "US", domain: "chase.com" },
  { id: "bank_of_america", name: "Bank of America", package: "com.infonow.bofa", region: "US", domain: "bankofamerica.com" },
  { id: "wells_fargo", name: "Wells Fargo", package: "com.wf.wellsfargomobile", region: "US", domain: "wellsfargo.com" },
  { id: "citi", name: "Citi Mobile", package: "com.citi.citimobile", region: "US", domain: "citi.com" },
  { id: "capital_one", name: "Capital One", package: "com.konylabs.capitalone", region: "US", domain: "capitalone.com" },
  { id: "american_express", name: "Amex", package: "com.americanexpress.android.acctsvcs.us", region: "US", domain: "americanexpress.com" },
  { id: "discover", name: "Discover Mobile", package: "com.discoverfinancial.mobile", region: "US", domain: "discover.com" },
  { id: "us_bank", name: "U.S. Bank", package: "com.usbank.mobilebanking", region: "US", domain: "usbank.com" },
  { id: "pnc", name: "PNC Mobile", package: "com.pnc.ecommerce.mobile.android", region: "US", domain: "pnc.com" },
  { id: "td_bank", name: "TD Bank (US)", package: "com.td", region: "US", domain: "td.com" },
  { id: "sofi", name: "SoFi", package: "com.sofi.mobile", region: "US", domain: "sofi.com" },
  { id: "venmo", name: "Venmo", package: "com.venmo", region: "US", domain: "venmo.com" },
  { id: "cash_app", name: "Cash App", package: "com.squareup.cash", region: "US", domain: "cash.app" },
  { id: "zelle", name: "Zelle", package: "com.zellepay.zelle", region: "US", domain: "zellepay.com" },
  { id: "robinhood", name: "Robinhood", package: "com.robinhood.android", region: "US", domain: "robinhood.com" },
  { id: "coinbase", name: "Coinbase", package: "com.coinbase.android", region: "Global", domain: "coinbase.com" },
  { id: "fidelity", name: "Fidelity Investments", package: "com.fidelity.android", region: "US", domain: "fidelity.com" },
  { id: "schwab", name: "Charles Schwab", package: "com.schwab.mobile", region: "US", domain: "schwab.com" },
  { id: "vanguard", name: "Vanguard", package: "com.vanguard", region: "US", domain: "vanguard.com" },
  { id: "paypal", name: "PayPal", package: "com.paypal.android.p2pmobile", region: "Global", domain: "paypal.com" },
  { id: "google_wallet", name: "Google Wallet / Pay", package: "com.google.android.apps.walletnfcrel", region: "Global", domain: "wallet.google.com" },

  // --- BRAZIL & LATAM ---
  { id: "nubank", name: "Nubank", package: "com.nu.production", region: "Brazil / LATAM", domain: "nubank.com.br" },
  { id: "itau", name: "Itaú", package: "com.itau", region: "Brazil", domain: "itau.com.br" },
  { id: "bradesco", name: "Bradesco", package: "com.bradesco", region: "Brazil", domain: "banco.bradesco" },
  { id: "banco_do_brasil", name: "Banco do Brasil", package: "br.com.bb.android", region: "Brazil", domain: "bb.com.br" },
  { id: "santander_br", name: "Santander Brasil", package: "com.santander.app", region: "Brazil", domain: "santander.com.br" },
  { id: "banco_inter", name: "Inter", package: "br.com.intermedium", region: "Brazil", domain: "inter.co" },
  { id: "c6_bank", name: "C6 Bank", package: "com.c6bank.app", region: "Brazil", domain: "c6bank.com.br" },
  { id: "mercado_pago", name: "Mercado Pago", package: "com.mercadopago.wallet", region: "LATAM", domain: "mercadopago.com" },
  { id: "picpay", name: "PicPay", package: "com.picpay", region: "Brazil", domain: "picpay.com" },
  { id: "pagbank", name: "PagBank", package: "br.com.uol.ps", region: "Brazil", domain: "pagbank.com.br" },
  { id: "binance", name: "Binance", package: "com.binance.dev", region: "Global", domain: "binance.com" },
  { id: "kraken", name: "Kraken", package: "com.kraken.invest.app", region: "Global", domain: "kraken.com" },
  { id: "bybit", name: "Bybit", package: "com.bybit.app", region: "Global", domain: "bybit.com" }
]

export const PRESET_BANK_APPS = BANKING_APPS_REGISTRY

