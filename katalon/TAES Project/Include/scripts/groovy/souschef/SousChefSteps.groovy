package souschef

import com.kms.katalon.core.testobject.SelectorMethod
import com.kms.katalon.core.testobject.TestObject
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import io.cucumber.java.After
import io.cucumber.java.en.Given
import io.cucumber.java.en.Then
import io.cucumber.java.en.When

class SousChefSteps {
    private static final String APP_URL = 'http://localhost:5174/'
    private static final String PREPARATION_STEP = 'Assa o tomate durante 20 minutos.'

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
        WebUI.waitForElementVisible(target, 10)
        WebUI.verifyElementText(target, expected)
    }

    @Given('que configurei um perfil vegetariano de teste para duas porções no Sous-Chef')
    void createProfile() {
        WebUI.openBrowser(APP_URL)
        WebUI.waitForElementVisible(element('#profile-name'), 10)
        WebUI.setText(element('#profile-name'), 'Casa Sous-Chef')
        WebUI.setText(element('#profile-servings'), '2')
        WebUI.selectOptionByValue(element('#profile-diet'), 'vegetarian', false)
        WebUI.setText(element('#profile-allergies'), 'amendoim')
        WebUI.setText(element('#profile-exclusions'), 'coentros')
        click('#save-profile')
    }

    @Given('tenho {string} na despensa com validade {string}')
    void addPantryItem(String name, String expiration) {
        click('#open-pantry')
        WebUI.waitForElementVisible(element('#food-name'), 10)
        WebUI.setText(element('#food-name'), name)
        WebUI.selectOptionByValue(element('#food-category'), 'Frigorífico', false)
        WebUI.setText(element('#food-quantity'), '400')
        WebUI.selectOptionByValue(element('#food-unit'), 'g', false)
        WebUI.executeJavaScript('document.getElementById("food-expiration").value = arguments[0]', [expiration])
        click('#save-food')
        verifyText('#pantry-success', 'Alimento adicionado com sucesso.')
        click('.pantry-header .pantry-back')
    }

    @When('peço uma sugestão com sobras')
    void generateSuggestion() {
        click('#open-recipes')
        click('.recipe-assistant > button')
    }

    @Then('vejo a receita {string} com duas porções, ingredientes e preparação')
    void verifySuggestion(String title) {
        String card = '.recipe-assistant article.recipe-suggestion'
        verifyText(card + ' h3', title)
        verifyText(card + ' .recipe-meta span:first-child', '25 min')
        verifyText(card + ' .recipe-meta span:nth-child(2)', '2 porções')
        verifyText(card + ' .recipe-ingredients li', 'Tomate — 400 g')
        verifyText(card + ' .recipe-instructions li', PREPARATION_STEP)
        verifyText(card + ' .recipe-assistant-note', 'Confirma os ingredientes e os alergénios antes de cozinhar.')
    }

    @When('guardo a sugestão e volto às receitas após recarregar')
    void saveAndReload() {
        click('.recipe-assistant article.recipe-suggestion button')
        verifyText('.recipe-assistant-status', 'Sugestão guardada no livro de receitas.')
        WebUI.refresh()
        click('#open-recipes')
    }

    @Then('posso consultar a sugestão guardada {string}')
    void verifySavedSuggestion(String title) {
        String savedSummary = '.recipe-assistant-saved summary'
        verifyText(savedSummary, title)
        click(savedSummary)
        verifyText('.recipe-assistant-saved details[open] .recipe-instructions li', PREPARATION_STEP)
    }

    @Then('o Sous-Chef mostra o aviso {string}')
    void verifyWarning(String message) {
        verifyText('.recipe-assistant [role="alert"]', message)
    }

    @Then('o Sous-Chef indica que não encontrou uma sugestão')
    void verifyEmptyResult() {
        verifyText('.recipe-assistant-status', 'Nenhuma sugestão encontrada para os alimentos e as restrições do perfil ativo.')
    }

    @Then('não há uma sugestão para guardar')
    void verifyNoSaveAction() {
        WebUI.verifyElementNotPresent(element('.recipe-assistant article.recipe-suggestion button'), 0)
    }

    @Then('{string} continua guardado na despensa')
    void verifyStock(String name) {
        click('.recipes-header button')
        click('#open-pantry')
        verifyText('#food-list li strong', name)
        verifyText('#food-list li .pantry-item-detail span:first-child', 'Quantidade: 400 g')
    }

    @After
    void closeBrowser() {
        WebUI.closeBrowser()
    }
}
