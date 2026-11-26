package shopping

import com.kms.katalon.core.testobject.ConditionType
import com.kms.katalon.core.testobject.SelectorMethod
import com.kms.katalon.core.testobject.TestObject
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import io.cucumber.java.After
import io.cucumber.java.en.Given
import io.cucumber.java.en.Then
import io.cucumber.java.en.When

class ShoppingListSteps {
    private static final String APP_URL = 'http://localhost:5173/'

    private static TestObject css(String selector) {
        TestObject target = new TestObject(selector)
        target.setSelectorMethod(SelectorMethod.CSS)
        target.setSelectorValue(SelectorMethod.CSS, selector)
        return target
    }

    private static TestObject xpath(String expression) {
        TestObject target = new TestObject(expression)
        target.addProperty('xpath', ConditionType.EQUALS, expression)
        return target
    }

    @Given('que abri a aplicação com um perfil de teste para a lista de compras')
    void openApp() {
        WebUI.openBrowser(APP_URL)
        if (WebUI.waitForElementPresent(css('#profile-name'), 3, com.kms.katalon.core.model.FailureHandling.OPTIONAL)) {
            WebUI.setText(css('#profile-name'), 'Perfil de teste')
            WebUI.click(css('#save-profile'))
        }
        WebUI.waitForElementVisible(css('#open-shopping-list'), 10)
    }

    @When('abro a lista de compras no dashboard')
    void openShoppingList() {
        WebUI.click(css('#open-shopping-list'))
        verifyShoppingList()
    }

    @When('adiciono {string} com quantidade {string} e unidade {string}')
    void addItem(String name, String quantity, String unit) {
        WebUI.setText(css('#shopping-item-name'), name)
        WebUI.setText(css('#shopping-item-quantity'), quantity)
        WebUI.selectOptionByValue(css('#shopping-item-unit'), unit, false)
        WebUI.click(css('.shopping-list-form button[type="submit"]'))
        WebUI.waitForElementVisible(css('.shopping-list-success'), 10)
    }

    @When('recarrego a aplicação e volto à lista de compras')
    void reloadApp() {
        WebUI.refresh()
        WebUI.waitForElementVisible(css('#open-shopping-list'), 10)
        openShoppingList()
    }

    @When('abro a lista de compras pelo cabeçalho da despensa')
    void openFromPantry() {
        WebUI.click(css('#open-pantry'))
        WebUI.waitForElementVisible(css('.pantry-header-actions'), 10)
        WebUI.click(xpath('//header[contains(@class,"pantry-header")]//button[normalize-space()="Lista de compras"]'))
    }

    @When('abro a lista de compras pelo cabeçalho das receitas')
    void openFromRecipes() {
        WebUI.click(css('#open-recipes'))
        WebUI.waitForElementVisible(css('.recipes-header-actions'), 10)
        WebUI.click(xpath('//header[contains(@class,"recipes-header")]//button[normalize-space()="Lista de compras"]'))
    }

    @Then('vejo a página da lista de compras')
    void verifyShoppingList() {
        WebUI.waitForElementVisible(css('#shopping-item-name'), 10)
        WebUI.verifyElementText(css('.shopping-list-header h1'), 'Lista de compras')
    }

    @Then('vejo que a lista de compras está vazia')
    void verifyEmptyList() {
        WebUI.verifyElementText(css('.shopping-list-empty h2'), 'A lista está vazia')
    }

    @Then('vejo {string} na lista com quantidade {string}')
    void verifyItem(String name, String quantity) {
        List<String> rows = WebUI.executeJavaScript(
            'return Array.from(document.querySelectorAll(".shopping-list-section li")).map(item => item.innerText)',
            []
        ) as List<String>
        assert rows.any { it.contains(name) && it.contains(quantity) }
    }

    @When('adiciono à lista os ingredientes em falta do arroz de frango')
    void addMissingIngredients() {
        WebUI.click(css('#open-recipes'))
        TestObject card = xpath('//article[contains(@class,"recipe-card")][.//h3[normalize-space()="Arroz de frango"]]//button')
        WebUI.waitForElementVisible(card, 10)
        WebUI.click(card)
        TestObject addButton = xpath('//div[contains(@class,"ingredients-warning")]//button[normalize-space()="Adicionar à lista de compras"]')
        WebUI.waitForElementVisible(addButton, 10)
        WebUI.click(addButton)
        WebUI.waitForElementVisible(css('.recipe-details [role="status"]'), 10)
        WebUI.click(xpath('//header[contains(@class,"recipes-header")]//button[normalize-space()="Voltar"]'))
        WebUI.waitForElementVisible(css('#open-shopping-list'), 10)
    }

    @When('marco {string} como comprado')
    void markBought(String name) {
        TestObject checkbox = xpath('//section[@aria-labelledby="pending-shopping-items-title"]//li[label/span[text()="' + name + '"]]//input')
        WebUI.waitForElementVisible(checkbox, 10)
        WebUI.click(checkbox)
    }

    @Then('vejo {string} na secção de comprados')
    void verifyBought(String name) {
        WebUI.waitForElementVisible(xpath('//section[@aria-labelledby="bought-shopping-items-title"]//li[label/span[text()="' + name + '"]]'), 10)
    }

    @When('transfiro {string} para a despensa com validade {string}')
    void transferItem(String name, String date) {
        TestObject transfer = xpath('//section[@aria-labelledby="bought-shopping-items-title"]//li[label/span[text()="' + name + '"]]//button')
        WebUI.waitForElementVisible(transfer, 10)
        WebUI.click(transfer)
        WebUI.setText(css('#transfer-expiration-date'), date)
        WebUI.click(css('.shopping-list-transfer-actions button[type="submit"]'))
    }

    @Then('vejo a confirmação da transferência')
    void verifyTransfer() {
        WebUI.waitForElementVisible(css('.shopping-list-success'), 10)
        WebUI.verifyElementText(css('.shopping-list-success'), 'Produto de teste US15 foi transferido para a despensa.')
    }

    @After
    void closeBrowser() {
        WebUI.closeBrowser()
    }
}
