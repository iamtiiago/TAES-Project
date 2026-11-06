import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import static com.kms.katalon.core.testobject.ObjectRepository.findWindowsObject
import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testng.keyword.TestNGBuiltinKeywords as TestNGKW
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.windows.keyword.WindowsBuiltinKeywords as Windows
import internal.GlobalVariable as GlobalVariable
import org.openqa.selenium.Keys as Keys

WebUI.openBrowser('')

WebUI.navigateToUrl('http://localhost:5173/')

WebUI.setText(findTestObject('Page_SmartPantry/input_Nome do perfil'), 'Teste')

WebUI.setText(findTestObject('Page_SmartPantry/input_Nmero habitual de pores'), '2')

WebUI.setText(findTestObject('Page_SmartPantry/input_Ex._ leite, amendoim'), 'Leite')

WebUI.setText(findTestObject('Page_SmartPantry/input_Ex._ cogumelos, coentros'), 'Coentros')

WebUI.click(findTestObject('Page_SmartPantry/button_save-profile'))

WebUI.click(findTestObject('Page_SmartPantry/button_Editar perfil'))

WebUI.setText(findTestObject('Page_SmartPantry/input_Nome do perfil'), 'Teste 2')

WebUI.setText(findTestObject('Page_SmartPantry/input_Nmero habitual de pores'), '3')

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_Regime alimentarOmnvoroVegetarianoVegan'), 'vegetarian', 
    false)

WebUI.setText(findTestObject('Page_SmartPantry/input_Ex._ leite, amendoim'), 'Leite, Cogumelos')

WebUI.setText(findTestObject('Page_SmartPantry/input_Ex._ cogumelos, coentros'), 'Coentros, Pão')

WebUI.click(findTestObject('Page_SmartPantry/button_save-profile'))

WebUI.click(findTestObject('Page_SmartPantry/button_create-profile'))

WebUI.setText(findTestObject('Page_SmartPantry/input_Nome do perfil'), 'Teste 3')

WebUI.setText(findTestObject('Page_SmartPantry/input_Nmero habitual de pores'), '3')

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_Regime alimentarOmnvoroVegetarianoVegan'), 'vegan', false)

WebUI.setText(findTestObject('Page_SmartPantry/input_Ex._ leite, amendoim'), 'Amendoim')

WebUI.setText(findTestObject('Page_SmartPantry/input_Ex._ cogumelos, coentros'), 'Cogumelos')

WebUI.click(findTestObject('Page_SmartPantry/button_save-profile'))

WebUI.click(findTestObject('Page_SmartPantry/button_Usar este perfil'))

WebUI.click(findTestObject('Page_SmartPantry/button_Usar este perfil_1'))

WebUI.click(findTestObject('Page_SmartPantry/button_Eliminar perfil'))

WebUI.click(findTestObject('Page_SmartPantry/button_Confirmar eliminao'))

WebUI.closeBrowser()

