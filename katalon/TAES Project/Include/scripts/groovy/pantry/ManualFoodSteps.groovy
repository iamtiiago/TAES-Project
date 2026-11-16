package pantry

import com.kms.katalon.core.testobject.SelectorMethod
import com.kms.katalon.core.testobject.TestObject
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import io.cucumber.java.After
import io.cucumber.java.en.Given
import io.cucumber.java.en.Then
import io.cucumber.java.en.When

class ManualFoodSteps {
    private static final String APP_URL = 'http://localhost:5173/'

    private static TestObject element(String selector) {
        TestObject target = new TestObject(selector)
        target.setSelectorMethod(SelectorMethod.CSS)
        target.setSelectorValue(SelectorMethod.CSS, selector)
        return target
    }

    @Given('que abri a despensa num navegador de teste')
    void openPantry() {
        WebUI.openBrowser(APP_URL)
        WebUI.waitForElementVisible(element('#profile-name'), 10)
        WebUI.setText(element('#profile-name'), 'Perfil de teste')
        WebUI.click(element('#save-profile'))
        openPantryScreen()
    }

    @When('guardo o alimento {string} em {string} com {string} {string} e validade {string}')
    void saveFood(String name, String category, String quantity, String unit, String expirationDate) {
        WebUI.setText(element('#food-name'), name)
        WebUI.selectOptionByValue(element('#food-category'), category, false)
        WebUI.setText(element('#food-quantity'), quantity)
        WebUI.selectOptionByValue(element('#food-unit'), unit, false)

        // The date input has different keyboard formats depending on the browser locale.
        WebUI.executeJavaScript(
            'document.getElementById("food-expiration").value = arguments[0]',
            [expirationDate]
        )
        WebUI.click(element('#save-food'))
    }

    @When('reabro a aplicação e volto à despensa')
    void reopenApp() {
        verifySuccess()
        WebUI.navigateToUrl('about:blank')
        WebUI.navigateToUrl(APP_URL)
        openPantryScreen()
    }

    @Then('vejo a confirmação de gravação')
    void verifySuccess() {
        WebUI.waitForElementVisible(element('#pantry-success'), 10)
        WebUI.verifyElementText(element('#pantry-success'), 'Alimento adicionado com sucesso.')
    }

    @Then('vejo {string} na lista com categoria {string}, quantidade {string} e validade {string}')
    void verifyFood(String name, String category, String quantity, String expirationDate) {
        TestObject item = element('#food-list li')
        WebUI.waitForElementVisible(item, 10)
        List<String> lines = WebUI.getText(item).readLines().collect { it.trim() }
        assert lines == [name, "Categoria: ${category}".toString(),
            "Quantidade: ${quantity}".toString(), "Validade: ${expirationDate}".toString()]
    }

    @Then('vejo um erro a pedir o nome do alimento')
    void verifyNameError() {
        WebUI.verifyElementText(element('#pantry-error'), 'Indica o nome do alimento.')
    }

    @Then('a lista da despensa continua vazia')
    void verifyEmptyPantry() {
        WebUI.verifyElementText(element('#pantry-empty'), 'A despensa está vazia.')
        WebUI.verifyElementNotPresent(element('#food-list li'), 0)
    }

    @After
    void closeBrowser() {
        WebUI.closeBrowser()
    }

    private static void openPantryScreen() {
        WebUI.waitForElementVisible(element('#open-pantry'), 10)
        WebUI.click(element('#open-pantry'))
        WebUI.waitForElementVisible(element('#food-name'), 10)
    }
}
