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

WebUI.click(findTestObject('Page_SmartPantry/button_save-profile'))

WebUI.click(findTestObject('Page_SmartPantry/button_open-pantry'))

WebUI.setText(findTestObject('Page_SmartPantry/input_Ex._ Arroz'), 'Arroz')

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_CategoriaSelecionar categoriaDespensaFrig'), 'Despensa', 
    false)

WebUI.setText(findTestObject('Page_SmartPantry/input_Ex._ 1'), '2')

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_UnidadeSelecionar unidadeungkgmlL'), 'kg', false)

WebUI.setText(findTestObject('Page_SmartPantry/input_Validade'), '2027-08-12')

WebUI.click(findTestObject('Page_SmartPantry/button_save-food'))

WebUI.setText(findTestObject('Page_SmartPantry/input_Pesquisar alimento'), 'Arroz')

WebUI.sendKeys(findTestObject('Page_SmartPantry/input_Pesquisar alimento'), 'Keys.chord(Keys.ENTER)')

WebUI.setText(findTestObject('Page_SmartPantry/input_Pesquisar alimento'), '')

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_CategoriaTodas as categoriasDespensaFrigo'), 'Despensa', 
    false)

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_CategoriaTodas as categoriasDespensaFrigo'), 'Frigorífico', 
    false)

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_CategoriaTodas as categoriasDespensaFrigo'), 'all', false)

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_ValidadeTodas as validadesExpiradosA expi'), 'expired', 
    false)

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_ValidadeTodas as validadesExpiradosA expi'), 'expiring', 
    false)

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_ValidadeTodas as validadesExpiradosA expi'), 'valid', 
    false)

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_ValidadeTodas as validadesExpiradosA expi'), 'all', false)

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_UnidadeTodas as unidadesungkgmlL'), 'un', false)

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_UnidadeTodas as unidadesungkgmlL'), 'g', false)

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_UnidadeTodas as unidadesungkgmlL'), 'kg', false)

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_UnidadeTodas as unidadesungkgmlL'), 'ml', false)

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_UnidadeTodas as unidadesungkgmlL'), 'L', false)

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_Comparar quantidadeSem comparaoMenos de'), 'less', false)

WebUI.selectOptionByValue(findTestObject('Page_SmartPantry/select_Comparar quantidadeSem comparaoMenos de'), 'greater', 
    false)

WebUI.setText(findTestObject('Page_SmartPantry/input_Ex._ 500'), '2')

WebUI.click(findTestObject('Page_SmartPantry/button_Limpar filtros'))

WebUI.closeBrowser()

