package airecipe

import com.kms.katalon.core.testobject.SelectorMethod
import com.kms.katalon.core.testobject.TestObject
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.model.FailureHandling
import io.cucumber.java.After
import io.cucumber.java.en.Given
import io.cucumber.java.en.Then
import io.cucumber.java.en.When

class AiRecipeSteps {
    private static TestObject css(String selector) {
        TestObject target = new TestObject(selector)
        target.setSelectorMethod(SelectorMethod.CSS)
        target.setSelectorValue(SelectorMethod.CSS, selector)
        return target
    }

    private static void clickButton(String label) {
        WebUI.executeJavaScript('''
            const button = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === arguments[0]);
            if (!button) throw new Error('Botão não encontrado: ' + arguments[0]);
            button.click();
        ''', [label])
    }

    @Given('que abri a US19 com um perfil e um alimento de teste')
    void openApp() {
        WebUI.openBrowser('http://localhost:5173/')
        if (WebUI.waitForElementPresent(css('#profile-name'), 3, FailureHandling.OPTIONAL)) {
            WebUI.setText(css('#profile-name'), 'Perfil de teste')
            WebUI.click(css('#save-profile'))
        }
        WebUI.waitForElementVisible(css('#open-pantry'), 10)
        WebUI.click(css('#open-pantry'))
        WebUI.waitForElementVisible(css('#food-name'), 10)
        WebUI.setText(css('#food-name'), 'Cenoura de teste')
        WebUI.selectOptionByValue(css('#food-category'), 'Despensa', false)
        WebUI.setText(css('#food-quantity'), '2')
        WebUI.selectOptionByValue(css('#food-unit'), 'un', false)
        WebUI.executeJavaScript('document.getElementById("food-expiration").value = arguments[0]', ['2030-12-31'])
        WebUI.click(css('#save-food'))
        WebUI.waitForElementVisible(css('#pantry-success'), 10)
        clickButton('Voltar aos perfis')
        WebUI.waitForElementVisible(css('#open-recipes'), 10)
        WebUI.click(css('#open-recipes'))
        WebUI.waitForElementVisible(css('.recipes-actions'), 10)
    }

    @Given('abri a sugestão de receita com IA')
    void openSuggestion() {
        clickButton('Gerar receita com IA')
        WebUI.waitForElementVisible(css('.ai-recipe-ingredients'), 10)
    }

    @Given('que o serviço de IA devolve uma receita de teste')
    void mockSuccess() {
        WebUI.executeJavaScript('''
            window.fetch = async (_url, options) => {
                window.recipeRequest = JSON.parse(options.body);
                return new Response(JSON.stringify({name:'Receita de teste', description:'Teste', preparationTime:20,
                    mealType:'Almoço', servings:1, ingredients:[{name:'Cenoura de teste', quantity:1, unit:'un'}],
                    instructions:['Preparar a cenoura.']}), {status:200, headers:{'Content-Type':'application/json'}});
            };
        ''', [])
    }

    @Given('que o serviço de IA devolve uma falha de teste')
    void mockFailure() {
        WebUI.executeJavaScript('window.fetch = async () => new Response(JSON.stringify({error:"Falha de teste"}), {status:502});', [])
    }

    @When('peço uma receita sem selecionar alimentos')
    void generateWithoutSelection() { clickButton('Gerar receita') }

    @When('seleciono o alimento e peço uma receita')
    void generateRecipe() {
        WebUI.executeJavaScript('''
            const label = Array.from(document.querySelectorAll('.ai-recipe-ingredients label')).find(l => l.textContent.includes('Cenoura de teste'));
            if (!label) throw new Error('Alimento de teste não encontrado');
            label.querySelector('input').click();
        ''', [])
        clickButton('Gerar receita')
    }

    @Then('vejo a mensagem a pedir um alimento')
    void verifySelectionError() {
        WebUI.verifyElementText(css('.ai-recipe-panel [role="alert"]'), 'Seleciona pelo menos um alimento da despensa.')
    }

    @Then('vejo a receita estruturada de teste')
    void verifyRecipe() {
        WebUI.waitForElementVisible(css('.ai-recipe-result'), 10)
        WebUI.verifyElementText(css('.ai-recipe-result h3'), 'Receita de teste')
        assert WebUI.getText(css('.ai-recipe-result')).contains('20 minutos')
        assert WebUI.getText(css('.ai-recipe-result')).contains('Preparar a cenoura.')
    }

    @Then('o pedido inclui o alimento e as preferências do perfil')
    void verifyRequest() {
        assert WebUI.executeJavaScript('return window.recipeRequest.ingredients.some(i => i.name === "Cenoura de teste") && window.recipeRequest.profile.servings > 0 && Array.isArray(window.recipeRequest.profile.allergies) && Array.isArray(window.recipeRequest.profile.excludedIngredients) && !!window.recipeRequest.profile.diet', [])
    }

    @Then('vejo uma mensagem de falha da IA')
    void verifyFailure() {
        WebUI.waitForElementVisible(css('.ai-recipe-panel [role="alert"]'), 10)
        WebUI.verifyElementText(css('.ai-recipe-panel [role="alert"]'), 'Falha de teste')
    }

    @After
    void closeBrowser() { WebUI.closeBrowser() }
}
