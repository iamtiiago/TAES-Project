Feature: US19 - Gerar receitas com sobras e preferências

  Background:
    Given que abri a US19 com um perfil e um alimento de teste
    And abri a sugestão de receita com IA

  Scenario: Pedir uma receita sem selecionar ingredientes
    When peço uma receita sem selecionar alimentos
    Then vejo a mensagem a pedir um alimento

  Scenario: Apresentar uma receita gerada com os dados do perfil
    Given que o serviço de IA devolve uma receita de teste
    When seleciono o alimento e peço uma receita
    Then vejo a receita estruturada de teste
    And o pedido inclui o alimento e as preferências do perfil

  Scenario: Informar uma falha do serviço de IA
    Given que o serviço de IA devolve uma falha de teste
    When seleciono o alimento e peço uma receita
    Then vejo uma mensagem de falha da IA
