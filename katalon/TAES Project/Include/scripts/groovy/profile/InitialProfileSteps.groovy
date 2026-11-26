package profile

import com.kms.katalon.core.testobject.SelectorMethod
import com.kms.katalon.core.testobject.TestObject
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import io.cucumber.java.After
import io.cucumber.java.en.Given
import io.cucumber.java.en.Then
import io.cucumber.java.en.When

class InitialProfileSteps {
    private static final String APP_URL = 'http://localhost:5173/'

    private static TestObject element(String selector) {
        TestObject target = new TestObject(selector)
        target.setSelectorMethod(SelectorMethod.CSS)
        target.setSelectorValue(SelectorMethod.CSS, selector)
        return target
    }

    @Given('que abri o SmartPantry pela primeira vez num navegador de teste')
    void openFirstRun() {
        WebUI.openBrowser(APP_URL)
        WebUI.waitForElementVisible(element('#profile-name'), 10)
        WebUI.verifyElementText(element('main h2'), 'Bem-vindo ao SmartPantry')
    }

    @When('guardo o perfil com as preferências predefinidas')
    void saveDefaultProfile() {
        WebUI.click(element('#save-profile'))
    }

    @When('guardo o perfil {string} com {string} porções, regime {string}, alergias {string} e exclusões {string}')
    void saveProfile(String name, String servings, String diet, String allergies, String exclusions) {
        WebUI.setText(element('#profile-name'), name)
        WebUI.setText(element('#profile-servings'), servings)
        WebUI.selectOptionByValue(element('#profile-diet'), diet, false)
        WebUI.setText(element('#profile-allergies'), allergies)
        WebUI.setText(element('#profile-exclusions'), exclusions)
        WebUI.click(element('#save-profile'))
    }

    @When('recarrego o SmartPantry no mesmo navegador')
    void reloadApp() {
        WebUI.refresh()
    }

    @Then('vejo {string} como perfil ativo')
    void verifyActiveProfile(String name) {
        TestObject savedName = element('#saved-profile-name')
        WebUI.waitForElementVisible(savedName, 10)
        WebUI.verifyElementText(savedName, name)
        WebUI.verifyElementText(element('#active-profile-selector option:checked'), name)
    }

    @Then('vejo o número de porções {string}, regime {string}, alergias {string} e exclusões {string}')
    void verifyPreferences(String servings, String diet, String allergies, String exclusions) {
        List<String> lines = WebUI.getText(element('#profile-summary')).readLines().collect { it.trim() }

        assert lines.containsAll([
            "Porções: ${servings}".toString(),
            "Regime alimentar: ${diet}".toString(),
            "Alergias: ${allergies}".toString(),
            "Ingredientes excluídos: ${exclusions}".toString(),
        ])
    }

    @When('tento guardar o perfil inicial com {string} porções')
    void submitWithInvalidServings(String servings) {
        WebUI.setText(element('#profile-servings'), servings)
        WebUI.click(element('#save-profile'))
    }

    @Then('vejo o erro de porções e continuo no formulário inicial')
    void verifyServingsError() {
        WebUI.verifyElementText(element('#profile-error'), 'O número de porções tem de ser um inteiro igual ou superior a 1.')
        WebUI.verifyElementVisible(element('#profile-name'))
    }

    @After
    void closeBrowser() {
        WebUI.closeBrowser()
    }
}
