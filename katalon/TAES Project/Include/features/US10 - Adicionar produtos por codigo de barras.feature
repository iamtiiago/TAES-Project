Feature: US10 - Adicionar produtos por código de barras

  Background:
    Given que abri a despensa para testar o leitor de códigos de barras

  Scenario: Ler pela câmara, preencher o formulário e guardar o produto confirmado
    Given a câmara de teste está configurada para "conhecido"
    When abro o leitor de códigos de barras
    Then vejo o produto reconhecido e os dados preenchidos
    When ajusto os dados do produto e guardo
    Then o produto ajustado continua na despensa após recarregar

  Scenario: Um código desconhecido permite continuar pelo formulário manual
    Given a câmara de teste está configurada para "desconhecido"
    When abro o leitor de códigos de barras
    Then vejo a indicação de produto não encontrado
    When preencho e guardo um alimento manualmente
    Then vejo o alimento manual guardado

  Scenario: O acesso recusado à câmara permite fechar o leitor e preencher manualmente
    Given a câmara de teste está configurada para "acesso recusado"
    When abro o leitor de códigos de barras
    Then vejo a mensagem de câmara recusada
    When fecho o leitor de códigos de barras
    Then posso voltar a preencher o formulário manual
