import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW

CucumberKW.GLUE = ['profile']
CucumberKW.runFeatureFile('Include/features/US01 - Configurar o perfil inicial.feature')
