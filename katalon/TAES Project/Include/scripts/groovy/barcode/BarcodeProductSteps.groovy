package barcode

import com.kms.katalon.core.testobject.SelectorMethod
import com.kms.katalon.core.testobject.TestObject
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import io.cucumber.java.After
import io.cucumber.java.en.Given
import io.cucumber.java.en.Then
import io.cucumber.java.en.When

class BarcodeProductSteps {
    private static final String APP_URL = 'http://localhost:5175/'
    // 95 módulos do código EAN-13 de teste 4006381333931, incluindo guardas.
    private static final String EAN13_MODULES = '10100011010100111010111101111010001001011001101010100001010000101000010111010010000101100110101'

    private static TestObject element(String selector) {
        TestObject target = new TestObject(selector)
        target.setSelectorMethod(SelectorMethod.CSS)
        target.setSelectorValue(SelectorMethod.CSS, selector)
        return target
    }

    private static void click(String selector) {
        TestObject target = element(selector)
        WebUI.waitForElementClickable(target, 10)
        WebUI.click(target)
    }

    private static void verifyText(String selector, String expected) {
        TestObject target = element(selector)
        WebUI.waitForElementVisible(target, 15)
        WebUI.verifyElementText(target, expected)
    }

    @Given('que abri a despensa para testar o leitor de códigos de barras')
    void openFirstRun() {
        WebUI.openBrowser(APP_URL)
        WebUI.waitForElementVisible(element('#profile-name'), 10)
        WebUI.setText(element('#profile-name'), 'Casa US10')
        click('#save-profile')
        click('#open-pantry')
    }

    @Given('a câmara de teste está configurada para {string}')
    void configureCamera(String fixture) {
        WebUI.executeJavaScript('''
            const [mode, modules] = arguments;
            const originalFetch = window.fetch.bind(window);
            window.fetch = (resource, options) => {
              const url = new URL(resource instanceof Request ? resource.url : resource, window.location.href);
              if (url.origin !== "https://world.openfoodfacts.org") return originalFetch(resource, options);
              if (url.pathname !== "/api/v2/product/4006381333931.json") {
                return Promise.reject(new Error("Código de teste inesperado."));
              }
              return Promise.resolve(mode === "desconhecido"
                ? Response.json({status: 0}, {status: 404})
                : Response.json({status: 1, product: {
                    product_name_pt: "Leite de teste", categories: "Laticínios, Leites",
                    quantity: "1 L", product_quantity: 1000, product_quantity_unit: "ml",
                  }}));
            };
            navigator.mediaDevices.getUserMedia = async () => {
              if (mode === "acesso recusado") throw new DOMException("Recusado", "NotAllowedError");
              const canvas = document.createElement("canvas");
              canvas.width = 680;
              canvas.height = 280;
              const ctx = canvas.getContext("2d");
              const stream = canvas.captureStream(12);
              const track = stream.getVideoTracks()[0];
              const draw = () => {
                if (track.readyState === "ended") {
                  clearInterval(timer);
                  return;
                }
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "black";
                [...modules].forEach((module, i) => {
                  if (module === "1") ctx.fillRect(55 + i * 6, 40, 6, 200);
                });
              };
              const timer = setInterval(draw, 80);
              draw();
              return stream;
            };
        ''', [fixture, EAN13_MODULES])
    }

    @When('abro o leitor de códigos de barras')
    void openScanner() {
        click('#open-barcode-scanner')
    }

    @Then('vejo o produto reconhecido e os dados preenchidos')
    void verifyRecognizedProduct() {
        verifyText('.pantry-product p:nth-child(2)', 'Código de barras: 4006381333931')
        verifyText('.pantry-product p:nth-child(3)', 'Tamanho da embalagem: 1 L')
        List<String> values = WebUI.executeJavaScript('''
            return ['food-name', 'food-category', 'food-quantity', 'food-unit']
                .map(id => document.getElementById(id).value);
        ''', [])
        assert values == ['Leite de teste', 'Leites', '1000', 'ml']
    }

    @When('ajusto os dados do produto e guardo')
    void saveRecognizedProduct() {
        WebUI.setText(element('#food-name'), 'Leite ajustado')
        WebUI.setText(element('#food-quantity'), '2')
        WebUI.selectOptionByValue(element('#food-unit'), 'L', false)
        finishSaving()
    }

    @Then('o produto ajustado continua na despensa após recarregar')
    void verifySavedProduct() {
        WebUI.refresh()
        click('#open-pantry')
        verifyPantryItem(['Leite ajustado', 'Leites', 'Quantidade: 2 L', 'Validade: 31/12/2099'])
    }

    @Then('vejo a indicação de produto não encontrado')
    void verifyUnknownProduct() {
        verifyText('.pantry-panel [role="alert"]', 'Produto não encontrado. Preenche os dados manualmente.')
    }

    @When('preencho e guardo um alimento manualmente')
    void saveFoodManually() {
        WebUI.setText(element('#food-name'), 'Batatas')
        WebUI.selectOptionByValue(element('#food-category'), 'Despensa', false)
        WebUI.setText(element('#food-quantity'), '2')
        WebUI.selectOptionByValue(element('#food-unit'), 'kg', false)
        finishSaving()
    }

    @Then('vejo o alimento manual guardado')
    void verifyManualProduct() {
        verifyPantryItem(['Batatas', 'Despensa', 'Quantidade: 2 kg', 'Validade: 31/12/2099'])
    }

    @Then('vejo a mensagem de câmara recusada')
    void verifyCameraDenied() {
        verifyText('.pantry-scanner [role="alert"]', 'O acesso à câmara foi recusado. Permite o acesso ou preenche os dados manualmente.')
    }

    @When('fecho o leitor de códigos de barras')
    void closeScanner() {
        click('#close-barcode-scanner')
    }

    @Then('posso voltar a preencher o formulário manual')
    void verifyManualForm() {
        WebUI.verifyElementNotPresent(element('.pantry-scanner'), 5)
        WebUI.waitForElementClickable(element('#food-name'), 10)
        WebUI.verifyElementClickable(element('#save-food'))
    }

    private static void finishSaving() {
        WebUI.executeJavaScript('''
            const date = document.getElementById("food-expiration");
            const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
            setValue.call(date, "2099-12-31");
            date.dispatchEvent(new Event("input", {bubbles: true}));
            date.dispatchEvent(new Event("change", {bubbles: true}));
        ''', [])
        click('#save-food')
        verifyText('.pantry-success', 'Alimento adicionado com sucesso.')
    }

    private static void verifyPantryItem(List<String> expected) {
        TestObject item = element('.pantry-items .pantry-item')
        WebUI.waitForElementVisible(item, 10)
        String actual = WebUI.getText(item)
        assert expected.every { actual.contains(it) }
    }

    @After
    void closeBrowser() {
        WebUI.closeBrowser()
    }
}
